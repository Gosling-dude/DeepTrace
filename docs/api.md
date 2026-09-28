# DeepTrace API Reference

The DeepTrace backend exposes a RESTful API built with FastAPI. Interactive documentation (Swagger UI) is available at `/docs` when running the backend.

## Base URL
Local Development: `http://localhost:8000/api/v1`

---

## 1. Authentication
All protected endpoints require a Bearer token in the Authorization header: `Authorization: Bearer <access_token>`.

### `POST /auth/register`
Register a new user account.
- **Body**: `{ "email": "user@example.com", "password": "securepassword", "full_name": "John Doe" }`
- **Response**: `201 Created` with JWT `access_token` and `refresh_token`.

### `POST /auth/login`
Authenticate an existing user.
- **Body**: `{ "email": "user@example.com", "password": "securepassword" }`
- **Response**: `200 OK` with JWT `access_token` and `refresh_token`.

### `POST /auth/refresh`
Exchange a valid refresh token for new access credentials.
- **Body**: `{ "refresh_token": "..." }`
- **Response**: `200 OK` with new tokens.

### `GET /auth/me`
Retrieve the currently authenticated user's profile data.
- **Auth**: Required
- **Response**: `200 OK` with User object (ID, email, name, role).

---

## 2. Image Inference
Endpoints for interacting with the AI detection pipeline.

### `POST /image/predict`
Upload an image and run the hybrid detection model.
- **Auth**: Required
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (binary image data)
- **Response**: `200 OK` with `InferenceResult` including `confidence`, `is_ai_generated`, and base64-encoded `explanation` heatmaps.

### `GET /image/history`
Retrieve the user's past predictions.
- **Auth**: Required
- **Query Params**: `page` (default 1), `per_page` (default 20)
- **Response**: `200 OK` with paginated list of predictions.

### `DELETE /image/history/{prediction_id}`
Delete a specific prediction and its associated uploaded file.
- **Auth**: Required
- **Response**: `200 OK`

---

## 2b. Video Deepfake Inference
Endpoints for the video deepfake detection pipeline (frame sampling → per-frame ensemble → temporal consistency → fusion).

### `POST /video/predict`
Upload a video and run deepfake detection.
- **Auth**: Required
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (mp4, mov, avi, webm, mkv, m4v; up to `VIDEO_MAX_FILE_SIZE_MB`, default 100MB)
- **Response**: `200 OK` with `VideoInferenceResult`:
  - `is_deepfake`, `confidence`
  - `scores`: `frame_mean`, `frame_topk`, `frame_max`, `temporal`, `ensemble` (fake probability)
  - `temporal`: `face_flicker`, `box_jitter`, `sharpness_variance`, `face_coverage`, `score`
  - `frame_scores`: `[{index, timestamp_s, score, face_detected}]` for each sampled frame
  - `video_meta`: `duration_s`, `fps`, `width`, `height`, `total_frames`, `sampled_frames`
  - `explanation`: base64 PNGs of the most suspicious frame (`keyframe_png_base64`), its face Grad-CAM (`saliency_png_base64`) and frequency map (`frequency_map_png_base64`)
- **Errors**: `400` for invalid type/extension/size or undecodable video (undecodable uploads are not stored).

### `GET /video/history`
Paginated list of the user's video predictions (`page`, `per_page`).

### `GET /video/history/{prediction_id}`
Full `VideoInferenceResult`; keyframe visuals are regenerated from the stored video.

### `DELETE /video/history/{prediction_id}`
Delete a video prediction and its stored video file.

---

## 3. Administration
Restricted endpoints for platform monitoring.

### `GET /admin/stats`
Aggregated platform statistics (total users, total predictions, error rates).
- **Auth**: Required (Admin role)

### `GET /admin/analytics/trends`
Time-series data for daily signups and predictions.
- **Auth**: Required (Admin role)

### `GET /admin/users`
Paginated list of all registered users for moderation.
- **Auth**: Required (Admin role)

### `GET /admin/audit-logs`
Security audit logs tracking critical actions across the platform.
- **Auth**: Required (Admin role)

---

## 4. System

### `GET /health`
Liveness probe for container orchestration.
- **Response**: `200 OK` with API version and status.

### `GET /model/video/status`
Status of the video deepfake detector (mode and whether the learned temporal fusion head is loaded).

### `GET /model/status`
Information about the loaded ML models in memory.
- **Response**: `200 OK` with model versions, device type, and readiness.
