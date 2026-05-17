# Testing and CI/CD Infrastructure

DeepTrace implements a rigorous, enterprise-grade testing pipeline designed to prevent regressions and ensure high availability across environments.

## 1. Test Isolation Strategy

We utilize `pytest` combined with FastAPI's `TestClient`. To guarantee deterministic tests that do not conflict with local development or production databases, our testing architecture forces strict isolation:

- **Environment Override**: The `conftest.py` strictly loads `.env.test` overriding any system variables.
- **In-Memory Database**: Tests instantiate a fresh SQLite in-memory database (`sqlite:///:memory:`) combined with SQLAlchemy's `StaticPool` to ensure thread-safe test isolation.
- **Fixture Lifecycle**: Before every single test, `Base.metadata.create_all()` is fired to create a blank schema, and `drop_all()` destroys it upon teardown. This ensures zero data leakage between tests.

### Running Local Tests

```bash
cd src/backend
# Tests will automatically bind to the in-memory isolated environment
pytest tests/ -v
```

---

## 2. CI/CD Workflows (GitHub Actions)

DeepTrace employs a multi-stage validation pipeline on every Pull Request and push to `main`.

### Continuous Integration (`ci.yml`)
1. **Backend Validation**:
   - provisions Python 3.10.
   - Restores dependency cache via `pip`.
   - Runs `flake8` for syntax and style enforcement.
   - Executes the full `pytest` integration suite against the in-memory test database.
2. **Frontend Validation**:
   - Provisions Node 18.
   - Restores dependency cache via `npm ci`.
   - Executes `tsc --noEmit` to validate all TypeScript definitions.
   - Executes `vite build` to guarantee a successful production bundle.

### Docker Deployment Validation (`docker.yml`)
To ensure the infrastructure-as-code remains pristine:
- Provisions the entire cluster (`docker-compose build`).
- Starts the stack (`docker-compose up -d`) using `.env.development`.
- Actively polls the backend (`/api/v1/health`) and frontend to confirm they start without fatal errors.
- Automatically captures and dumps container logs if the build or startup sequence fails, preventing broken code from merging.

---

## 3. Environment Segregation

DeepTrace supports strict environment boundaries:
- `.env.development`: Connects to `deeptrace_dev.db` with local mock models.
- `.env.test`: Connects to purely in-memory SQLite instances.
- `.env.production`: Designed to inject Docker/Kubernetes secrets for production PostgreSQL and actual PyTorch weights.
