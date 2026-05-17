# DeepTrace Deployment Guide

DeepTrace is containerized using Docker, allowing for reproducible and isolated deployments across local and production environments. 

The architecture consists of three main containers:
1. **Frontend**: Nginx serving the compiled React/Vite SPA.
2. **Backend**: FastAPI running via Uvicorn.
3. **Database**: PostgreSQL 16.

## Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.10+ (for local backend development)

---

## Production Deployment (Docker Compose)

The provided `infra/docker-compose.yml` is configured for a production-like environment using PostgreSQL.

### 1. Environment Configuration
Create a `.env` file in the root of the repository. Use the following template:

```env
# Application Settings
APP_NAME=DeepTrace
APP_ENV=production
APP_VERSION=1.0.0
DEBUG=False

# Security (MUST CHANGE IN PRODUCTION)
JWT_SECRET_KEY=your-super-secure-256bit-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# URLs & CORS
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# File Storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE_MB=10

# Default Admin Seed Account
ADMIN_EMAIL=admin@deeptrace.ai
ADMIN_PASSWORD=changeme123
ADMIN_NAME="DeepTrace Admin"
```

### 2. Launching the Cluster
From the root directory, build and start the containers in detached mode:

```bash
cd infra
docker-compose up --build -d
```

### 3. Verifying the Deployment
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`
- Database: Exposes port `5432` to the host.

To monitor the logs:
```bash
docker-compose logs -f
```

### 4. Admin Access
The system will automatically create the admin user specified in your `.env` file upon the first startup. You can log into the frontend using these credentials to access the Admin Dashboard.

---

## Production Hardening Recommendations

Before deploying to a public-facing domain, ensure the following measures are taken:
1. **Reverse Proxy / TLS**: Place a reverse proxy (e.g., Nginx, Traefik, AWS ALB) in front of the application to terminate HTTPS/SSL.
2. **Secrets Management**: Do not store `.env` in version control. Use AWS Secrets Manager, HashiCorp Vault, or GitHub Secrets for CI/CD injections.
3. **Database Volume**: Ensure the `pgdata` volume is backed up regularly. Consider managed database solutions (AWS RDS, GCP Cloud SQL) for high availability.
4. **CORS Validation**: Update `FRONTEND_URL` to match your exact production domain to strictly limit API access.
