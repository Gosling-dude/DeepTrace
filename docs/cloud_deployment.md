# Cloud Deployment Guide (Production)

This document outlines the step-by-step process for deploying DeepTrace into a true production environment using highly scalable, modern cloud providers.

## Target Architecture
- **Frontend**: Vercel (Global CDN, automated CI/CD for React)
- **Backend**: Render / Railway (Managed Docker containers)
- **Database**: Neon (Serverless PostgreSQL)
- **Storage**: Amazon S3 (For uploads and ML weights - *pending Phase 3*)

---

## 1. Database Deployment (Neon)
Neon provides serverless PostgreSQL that scales to zero, perfect for portfolio applications.

**Steps:**
1. Create a project on [Neon.tech](https://neon.tech/).
2. Copy the connection string. It will look like:
   `postgres://[user]:[password]@[endpoint].neon.tech/deeptrace?sslmode=require`
3. Save this string. You will need it for the Backend environment variables.

---

## 2. Backend Deployment (Render / Railway)
Both Render and Railway natively support Dockerfiles and automatically expose `$PORT`.

**Steps (Render Example):**
1. Create a new "Web Service".
2. Connect your GitHub repository.
3. Configure the build:
   - **Root Directory**: `.` (Root of repo)
   - **Environment**: `Docker`
   - **Dockerfile Path**: `src/backend/Dockerfile`
4. Add the following **Environment Variables**:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `APP_ENV` | `production` | Enforces secure CORS and disables debug docs. |
| `DATABASE_URL` | `postgres://...` | The string copied from Neon. |
| `JWT_SECRET_KEY` | `[generate_a_random_string]` | Generate via `openssl rand -hex 32`. |
| `FRONTEND_URL` | `https://your-vercel-domain.vercel.app` | Will configure after Step 3. |
| `ADMIN_EMAIL` | `admin@yourdomain.com` | Primary admin login. |
| `ADMIN_PASSWORD` | `[secure_password]` | Primary admin password. |

5. Deploy! The service will spin up, install the CPU-only PyTorch binaries, and start Uvicorn. Once active, copy the backend URL (e.g., `https://deeptrace-api.onrender.com`).

---

## 3. Frontend Deployment (Vercel)
Vercel automatically detects Vite.

**Steps:**
1. Import your GitHub repository into Vercel.
2. Vercel will automatically read the `vercel.json` provided in the repository root and set the build context to `src/frontend/app`.
3. Before clicking "Deploy", configure the **Environment Variables**:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://deeptrace-api.onrender.com` | The URL from Render (Step 2). |

4. Deploy! 

---

## 4. Final Wiring & Verification
Because the Frontend deployment generates the final public URL, you must update the Backend's CORS policy.

1. Go back to Render > Web Service > Environment.
2. Update `FRONTEND_URL` to match your exact Vercel URL (e.g., `https://deeptrace.vercel.app`).
3. Render will auto-deploy the change.

### Verification Checklist
- [ ] Visit the Vercel URL. Does the UI load?
- [ ] Open the Network Tab. Attempt to login with your `ADMIN_EMAIL`. Does the POST request succeed?
- [ ] If you see a CORS error, verify `FRONTEND_URL` on the backend precisely matches the Vercel origin (no trailing slash).
- [ ] Navigate to `/admin`. Does the dashboard populate?
- [ ] Perform an Image Upload. Does the inference run without `Internal Server Error`? (This verifies PyTorch loaded successfully).

---

## Rollback & Debugging Guidance
- **Database Migrations Failed**: If the app crashes on boot due to missing tables, ensure `APP_ENV` does not conflict. The FastAPI lifespan (`src/backend/app/main.py`) runs `Base.metadata.create_all()` automatically.
- **Out of Memory (OOM)**: PyTorch inference takes ~300MB RAM. Ensure your Render instance has at least 512MB RAM allocated. If the container crashes during an upload, upgrade the instance tier or increase swap space.
- **Broken Explainability Images**: If Grad-CAM heatmaps are broken, verify the backend can write to `/app/uploads`. The Dockerfile is configured to run as `appuser` and owns this directory.
