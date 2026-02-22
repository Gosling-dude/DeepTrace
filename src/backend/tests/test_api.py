import pytest
from fastapi.testclient import TestClient
from src.backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "DeepTrace Model Backend"}

def test_model_status():
    response = client.get("/api/v1/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "model_name" in data
    assert "version" in data
