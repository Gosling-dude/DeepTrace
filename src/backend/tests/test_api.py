"""
Basic health/system endpoint tests.
"""
import pytest


def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "DeepTrace API"
    assert "version" in data


def test_model_status(client):
    response = client.get("/api/v1/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "model_name" in data
    assert "version" in data
    assert "is_ready" in data
