import pytest
from src.backend.models.db_models import User

def get_auth_headers(client, email, password="password123"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def test_admin_access_allowed(client, db_session):
    # Register and manually upgrade to admin
    client.post("/api/v1/auth/register", json={"email": "admin@test.com", "password": "password123", "full_name": "Admin User"})
    db = db_session
    user = db.query(User).filter(User.email == "admin@test.com").first()
    user.role = "admin"
    db.commit()

    headers = get_auth_headers(client, "admin@test.com")
    res = client.get("/api/v1/admin/stats", headers=headers)
    assert res.status_code == 200
    assert "total_users" in res.json()

def test_admin_access_denied_for_regular_user(client):
    # Register standard user
    client.post("/api/v1/auth/register", json={"email": "user@test.com", "password": "password123", "full_name": "Standard User"})
    
    headers = get_auth_headers(client, "user@test.com")
    res = client.get("/api/v1/admin/stats", headers=headers)
    # Should be forbidden
    assert res.status_code == 403
    assert res.json()["detail"] == "Admin access required"

def test_unauthenticated_admin_access(client):
    res = client.get("/api/v1/admin/stats")
    assert res.status_code == 401
