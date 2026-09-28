"""
Video preprocessing: decoding, frame sampling, and face localisation.

Frames are sampled uniformly across the clip so long videos cost the same as
short ones. Faces are located with OpenCV's YuNet detector when its ONNX model
is available (see scripts/download_weights.py), otherwise the Haar cascade
bundled with OpenCV 4.x; when no face is found the frame falls back to a
centre crop, mirroring the image pipeline.
"""

import os
import logging
import tempfile
from dataclasses import dataclass, field

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger("DeepTrace.video.preprocess")

YUNET_FILENAME = "face_detection_yunet_2023mar.onnx"

_face_detector = None


class _YuNetDetector:
    """OpenCV DNN face detector (YuNet). Needs the ONNX model in MODEL_WEIGHTS_DIR."""

    def __init__(self, model_path: str):
        self.detector = cv2.FaceDetectorYN.create(model_path, "", (320, 320), 0.8, 0.3, 50)

    def detect(self, rgb: np.ndarray) -> list[tuple[int, int, int, int]]:
        h, w = rgb.shape[:2]
        self.detector.setInputSize((w, h))
        _, faces = self.detector.detect(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
        if faces is None:
            return []
        return [tuple(int(v) for v in f[:4]) for f in faces]


class _HaarDetector:
    """Haar cascade bundled with OpenCV 4.x (removed from the main package in OpenCV 5)."""

    def __init__(self, cascade):
        self.cascade = cascade

    def detect(self, rgb: np.ndarray) -> list[tuple[int, int, int, int]]:
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        min_side = max(24, min(gray.shape[:2]) // 12)
        faces = self.cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(min_side, min_side))
        return [tuple(int(v) for v in f) for f in faces]


def _load_face_detector():
    """Pick the best available face detector: YuNet > Haar cascade > none (centre crop)."""
    from ..app.config import get_settings

    yunet_path = os.path.join(get_settings().MODEL_WEIGHTS_DIR, YUNET_FILENAME)
    if os.path.exists(yunet_path) and hasattr(cv2, "FaceDetectorYN"):
        try:
            logger.info("Using YuNet face detector.")
            return _YuNetDetector(yunet_path)
        except Exception as e:
            logger.warning(f"Failed to load YuNet face detector: {e}")

    if hasattr(cv2, "CascadeClassifier"):
        cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
        cascade = cv2.CascadeClassifier(cascade_path)
        if not cascade.empty():
            logger.info("Using Haar cascade face detector.")
            return _HaarDetector(cascade)

    logger.warning(
        f"No face detector available (add {YUNET_FILENAME} to MODEL_WEIGHTS_DIR); falling back to centre crops."
    )
    return None


def _get_face_detector():
    global _face_detector
    if _face_detector is None:
        _face_detector = _load_face_detector() or False
    return _face_detector or None


@dataclass
class SampledFrame:
    index: int                      # frame index in the source video
    timestamp_s: float              # position in seconds
    frame: Image.Image              # full RGB frame
    face: Image.Image               # face crop (or centre crop fallback)
    face_detected: bool
    face_box: tuple[int, int, int, int] | None = None  # x, y, w, h


@dataclass
class VideoSample:
    duration_s: float
    fps: float
    width: int
    height: int
    total_frames: int
    frames: list[SampledFrame] = field(default_factory=list)

    @property
    def meta(self) -> dict:
        return {
            "duration_s": round(self.duration_s, 2),
            "fps": round(self.fps, 2),
            "width": self.width,
            "height": self.height,
            "total_frames": self.total_frames,
            "sampled_frames": len(self.frames),
        }


def _center_crop(image: Image.Image) -> Image.Image:
    width, height = image.size
    size = min(width, height)
    left = (width - size) // 2
    top = (height - size) // 2
    return image.crop((left, top, left + size, top + size))


def detect_face_box(rgb: np.ndarray) -> tuple[int, int, int, int] | None:
    """Return the largest detected face (x, y, w, h), or None."""
    detector = _get_face_detector()
    if detector is None:
        return None
    faces = [f for f in detector.detect(rgb) if f[2] > 0 and f[3] > 0]
    if not faces:
        return None
    return max(faces, key=lambda f: f[2] * f[3])


def crop_face(image: Image.Image, box: tuple[int, int, int, int] | None, margin: float = 0.25) -> Image.Image:
    """Crop a square region around the face box with some context margin."""
    if box is None:
        return _center_crop(image)
    x, y, w, h = box
    cx, cy = x + w / 2, y + h / 2
    half = max(w, h) * (1 + margin) / 2
    width, height = image.size
    left = int(max(0, cx - half))
    top = int(max(0, cy - half))
    right = int(min(width, cx + half))
    bottom = int(min(height, cy + half))
    return image.crop((left, top, right, bottom))


def _write_temp_video(video_bytes: bytes, suffix: str) -> str:
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        f.write(video_bytes)
    return path


def _open_capture(path: str) -> cv2.VideoCapture:
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        cap.release()
        raise ValueError("Unable to decode video. The file may be corrupt or use an unsupported codec")
    return cap


def _count_frames(cap: cv2.VideoCapture) -> int:
    """Frame count from container metadata, or by scanning when it is missing (e.g. webm)."""
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if total > 0:
        return total
    total = 0
    while cap.grab():
        total += 1
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    return total


def _read_frame(cap: cv2.VideoCapture, index: int) -> np.ndarray | None:
    cap.set(cv2.CAP_PROP_POS_FRAMES, index)
    ok, frame = cap.read()
    if not ok or frame is None:
        return None
    return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)


def _build_sampled_frame(rgb: np.ndarray, index: int, fps: float) -> SampledFrame:
    image = Image.fromarray(rgb)
    box = detect_face_box(rgb)
    return SampledFrame(
        index=index,
        timestamp_s=round(index / fps, 3) if fps > 0 else 0.0,
        frame=image,
        face=crop_face(image, box),
        face_detected=box is not None,
        face_box=box,
    )


def sample_video(video_bytes: bytes, num_frames: int = 16, suffix: str = ".mp4") -> VideoSample:
    """Decode a video and uniformly sample up to `num_frames` frames."""
    path = _write_temp_video(video_bytes, suffix)
    try:
        cap = _open_capture(path)
        try:
            fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
            total = _count_frames(cap)
            if total <= 0:
                raise ValueError("Video contains no decodable frames")

            n = max(1, min(num_frames, total))
            indices = sorted(set(np.linspace(0, total - 1, n).round().astype(int).tolist()))

            frames = []
            for idx in indices:
                rgb = _read_frame(cap, idx)
                if rgb is None:
                    continue
                frames.append(_build_sampled_frame(rgb, idx, fps))

            if not frames:
                raise ValueError("Video contains no decodable frames")

            if width == 0 or height == 0:
                width, height = frames[0].frame.size
            duration = total / fps if fps > 0 else 0.0
            return VideoSample(duration, fps, width, height, total, frames)
        finally:
            cap.release()
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


def read_single_frame(video_path: str, index: int) -> SampledFrame | None:
    """Read one frame from a stored video (used to rebuild explanations on demand)."""
    try:
        cap = _open_capture(video_path)
    except ValueError:
        return None
    try:
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        rgb = _read_frame(cap, index)
        if rgb is None:
            return None
        return _build_sampled_frame(rgb, index, fps)
    finally:
        cap.release()


# ─── Temporal consistency ───────────────────────────────

def _face_patch(frame: SampledFrame, size: int = 96) -> np.ndarray:
    return np.asarray(frame.face.convert("L").resize((size, size)), dtype=np.float32) / 255.0


def compute_temporal_features(frames: list[SampledFrame]) -> dict:
    """
    Signals of temporal inconsistency typical of face-swap / reenactment deepfakes.

    - face_flicker: how much the face region changes between samples relative to
      the whole frame. Swapped faces are generated per-frame and tend to flicker
      more than their surroundings.
    - box_jitter: normalised instability of the detected face box size/position.
    - sharpness_variance: variation of face-region sharpness (Laplacian variance);
      blending artifacts make face detail inconsistent over time.
    - face_coverage: fraction of sampled frames with a detected face.

    Each signal is squashed to [0, 1]; `score` is their weighted combination.
    """
    n = len(frames)
    face_coverage = sum(f.face_detected for f in frames) / n if n else 0.0
    if n < 2:
        return {
            "face_flicker": 0.0, "box_jitter": 0.0, "sharpness_variance": 0.0,
            "face_coverage": round(face_coverage, 4), "score": 0.0,
        }

    patches = [_face_patch(f) for f in frames]
    globals_ = [np.asarray(f.frame.convert("L").resize((96, 96)), dtype=np.float32) / 255.0 for f in frames]
    face_diff = np.mean([np.abs(a - b).mean() for a, b in zip(patches, patches[1:])])
    glob_diff = np.mean([np.abs(a - b).mean() for a, b in zip(globals_, globals_[1:])])
    ratio = face_diff / (glob_diff + 1e-3)
    face_flicker = float(np.clip((ratio - 1.0) / 2.0, 0.0, 1.0))

    boxes = [f.face_box for f in frames if f.face_box is not None]
    if len(boxes) >= 2:
        arr = np.array(boxes, dtype=np.float32)
        scale = np.mean(arr[:, 2:]) + 1e-6
        centers = arr[:, :2] + arr[:, 2:] / 2
        size_jitter = np.std(arr[:, 2]) / scale
        center_jitter = np.mean(np.linalg.norm(np.diff(centers, axis=0), axis=1)) / scale
        box_jitter = float(np.clip(size_jitter * 2.0 + center_jitter * 0.5, 0.0, 1.0))
    else:
        box_jitter = 0.0

    sharpness = np.array([
        cv2.Laplacian(np.uint8(p * 255), cv2.CV_64F).var() for p in patches
    ])
    sharp_cv = float(np.std(sharpness) / (np.mean(sharpness) + 1e-6))
    sharpness_variance = float(np.clip(sharp_cv, 0.0, 1.0))

    score = 0.5 * face_flicker + 0.25 * box_jitter + 0.25 * sharpness_variance
    return {
        "face_flicker": round(face_flicker, 4),
        "box_jitter": round(box_jitter, 4),
        "sharpness_variance": round(sharpness_variance, 4),
        "face_coverage": round(face_coverage, 4),
        "score": round(float(np.clip(score, 0.0, 1.0)), 4),
    }
