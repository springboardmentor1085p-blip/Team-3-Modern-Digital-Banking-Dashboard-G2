import pytest
from fastapi.testclient import TestClient

from app.tests.test_auth import client, test_db

def test_create_account(test_db):
    """Test creating an account"""
    # First login to get token
    client.post("/api/v1/auth/register", json={
        "username": "accountuser",
        "email": "account@example.com",
        "password": "accountpass123",
        "full_name": "Account User"
    })
    
    login_response = client.post("/api/v1/auth/login", data={
        "username": "accountuser",
        "password": "accountpass123"
    })
    token = login_response.json()["access_token"]
    
    # Create account
    response = client.post(
        "/api/v1/accounts/",
        json={
            "account_type": "checking",
            "balance": 1000.00,
            "currency": "USD",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["account_type"] == "checking"
    assert data["balance"] == "1000.00"
    assert "account_number" in data

def test_get_accounts(test_db):
    """Test getting user accounts"""
    # Login
    login_response = client.post("/api/v1/auth/login", data={
        "username": "accountuser",
        "password": "accountpass123"
    })
    token = login_response.json()["access_token"]
    
    # Get accounts
    response = client.get(
        "/api/v1/accounts/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_get_account_unauthorized(test_db):
    """Test getting account without authentication"""
    response = client.get("/api/v1/accounts/")
    assert response.status_code == 401