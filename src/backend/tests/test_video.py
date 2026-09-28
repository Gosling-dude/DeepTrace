"""
Video deepfake detection tests: pipeline units and API endpoints.
"""

import os
import tempfile

import cv2
import numpy as np
import pytest

from src.backend.models.video_core import aggregate_frame_scores
from src.backend.services.video_inference import run_video_prediction
from src.backend.services.video_preprocess import sample_video, compute_temporal_features


def make_video_bytes(num_frames: int = 24, size: tuple[int, int] = (320, 240), fps: int = 12) -> bytes:
    """Encode a small synthetic MJPG/AVI clip (a moving square over noise)."""
    fd, path = tempfile.mkstemp(suffix=".avi")
    os.close(fd)
    try:
        writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"MJPG"), fps, size)
        rng = np.random.default_rng(0)
        for i in range(num_frames):
            frame = rng.integers(0, 60, (size[1], size[0], 3), dtype=np.uint8)
            x = 20 + i * 5
            cv2.rectangle(frame, (x, 60), (x + 80, 160), (200, 180, 160), -1)
            writer.write(frame)
        writer.release()
        with open(path, "rb") as f:
            return f.read()
    finally:
        os.remove(path)


@pytest.fixture(scope="module")
def video_bytes():
    return make_video_bytes()


def _auth_headers(client) -> dict:
    client.post(
        "/api/v1/auth/register",
        json={"email": "video@example.com", "password": "password123", "full_name": "Video User"},
    )
    res = client.post("/api/v1/auth/login", json={"email": "video@example.com", "password": "password123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


# ─── Pipeline units ─────────────────────────────────────

def test_sample_video_uniform_frames(video_bytes):
    sample = sample_video(video_bytes, num_frames=8, suffix=".avi")
    assert len(sample.frames) == 8
    assert sample.total_frames == 24
    assert sample.width == 320 and sample.height == 240
    indices = [f.index for f in sample.frames]
    assert indices[0] == 0 and indices[-1] == 23
    assert indices == sorted(indices)


def test_sample_video_rejects_garbage():
    with pytest.raises(ValueError):
        sample_video(b"definitely not a video" * 100, suffix=".mp4")


def test_temporal_features_bounded(video_bytes):
    sample = sample_video(video_bytes, num_frames=8, suffix=".avi")
    feats = compute_temporal_features(sample.frames)
    for key in ("face_flicker", "box_jitter", "sharpness_variance", "face_coverage", "score"):
        assert 0.0 <= feats[key] <= 1.0


def test_temporal_features_static_video_is_stable():
    sample = sample_video(make_video_bytes(num_frames=10), num_frames=10, suffix=".avi")
    # Freeze every frame to the first one: no temporal change at all.
    for f in sample.frames:
        f.frame, f.face = sample.frames[0].frame, sample.frames[0].face
    feats = compute_temporal_features(sample.frames)
    assert feats["face_flicker"] == 0.0
    assert feats["sharpness_variance"] == 0.0


def test_aggregate_frame_scores_topk():
    agg = aggregate_frame_scores([0.1, 0.1, 0.1, 0.9])
    assert agg["frame_max"] == pytest.approx(0.9)
    assert agg["frame_topk"] == pytest.approx(0.9)
    assert agg["frame_mean"] == pytest.approx(0.3)


def test_run_video_prediction(video_bytes):
    res = run_video_prediction(video_bytes, suffix=".avi")
    assert isinstance(res["is_deepfake"], bool)
    assert 0.5 <= res["confidence"] <= 1.0
    assert set(res["scores"]) == {"frame_mean", "frame_max", "frame_topk", "temporal", "ensemble"}
    assert len(res["frame_scores"]) == 16
    assert res["keyframe_index"] in [f["index"] for f in res["frame_scores"]]
    assert res["explanation"]["keyframe_png_base64"].startswith("data:image/png;base64,")
    # Synthetic clip has no faces, so the user should be warned.
    assert any("No faces" in w for w in res["warnings"])


# ─── API ────────────────────────────────────────────────

def test_video_predict_requires_auth(client, video_bytes):
    res = client.post("/api/v1/video/predict", files={"file": ("clip.avi", video_bytes, "video/x-msvideo")})
    assert res.status_code == 401


def test_video_predict_rejects_image(client):
    headers = _auth_headers(client)
    res = client.post(
        "/api/v1/video/predict", headers=headers, files={"file": ("photo.jpg", b"\xff\xd8\xff" * 10, "image/jpeg")}
    )
    assert res.status_code == 400


def test_video_predict_rejects_corrupt_video(client):
    headers = _auth_headers(client)
    res = client.post(
        "/api/v1/video/predict", headers=headers, files={"file": ("broken.mp4", b"\x00" * 2048, "video/mp4")}
    )
    assert res.status_code == 400
    # Undecodable uploads are not stored.
    history = client.get("/api/v1/video/history", headers=headers).json()
    assert history["total"] == 0


def test_video_predict_history_detail_delete(client, video_bytes):
    headers = _auth_headers(client)

    res = client.post(
        "/api/v1/video/predict", headers=headers, files={"file": ("clip.avi", video_bytes, "video/x-msvideo")}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["original_filename"] == "clip.avi"
    assert data["video_meta"]["total_frames"] == 24
    assert len(data["frame_scores"]) > 0
    pred_id = data["id"]

    history = client.get("/api/v1/video/history", headers=headers).json()
    assert history["total"] == 1
    assert history["predictions"][0]["id"] == pred_id

    detail = client.get(f"/api/v1/video/history/{pred_id}", headers=headers)
    assert detail.status_code == 200
    detail = detail.json()
    assert detail["is_deepfake"] == data["is_deepfake"]
    assert detail["frame_scores"] == data["frame_scores"]
    assert detail["explanation"]["keyframe_png_base64"].startswith("data:image/png;base64,")

    # Image history is unaffected by video uploads.
    assert client.get("/api/v1/image/history", headers=headers).json()["total"] == 0

    res = client.delete(f"/api/v1/video/history/{pred_id}", headers=headers)
    assert res.status_code == 200
    assert client.get(f"/api/v1/video/history/{pred_id}", headers=headers).status_code == 404


def test_video_model_status(client):
    res = client.get("/api/v1/model/video/status")
    assert res.status_code == 200
    assert res.json()["version"].startswith("video-")
