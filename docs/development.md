# Local Development Guide

This guide covers setting up DeepTrace for local development outside of Docker.

## 1. Backend Setup

The backend requires Python 3.10+.

```bash
# Navigate to backend
cd src/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the development server
uvicorn src.backend.app.main:app --reload --port 8000
```
*Note: By default, the local backend will use a SQLite database (`deeptrace.db`) instead of PostgreSQL.*

## 2. Frontend Setup

The frontend requires Node.js 18+.

```bash
# Navigate to frontend
cd src/frontend/app

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*The frontend will run on `http://localhost:5173`. Vite is configured to proxy API requests starting with `/api` to `http://localhost:8000` automatically to avoid CORS issues during development.*

## 3. Database Migrations (Future-proofing)
While the system currently leverages SQLAlchemy's `create_all()` in the application lifespan for immediate schema generation, future structural changes should use Alembic.

To generate a migration after changing `db_models.py`:
```bash
alembic revision --autogenerate -m "Description of change"
alembic upgrade head
```

## 4. Running Tests
Tests are built using `pytest`. Run them from the project root:

```bash
# Ensure you are in the virtual environment
cd src/backend
pytest tests/ -v
```

## 5. Adding New Frontend Dependencies
Ensure any new packages are compatible with Vite and React 18:
```bash
npm install <package-name>
```
