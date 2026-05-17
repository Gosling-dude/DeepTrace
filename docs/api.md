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

### `GET /model/status`
Information about the loaded ML models in memory.
- **Response**: `200 OK` with model versions, device type, and readiness.
