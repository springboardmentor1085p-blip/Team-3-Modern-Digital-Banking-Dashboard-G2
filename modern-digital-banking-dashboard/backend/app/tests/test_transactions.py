import pytest
from fastapi.testclient import TestClient

from app.tests.test_auth import client, test_db

def test_create_transaction(test_db):
    """Test creating a transaction"""
    # Login
    login_response = client.post("/api/v1/auth/login", data={
        "username": "accountuser",
        "password": "accountpass123"
    })
    token = login_response.json()["access_token"]
    
    # First get account ID
    accounts_response = client.get(
        "/api/v1/accounts/",
        headers={"Authorization": f"Bearer {token}"}
    )
    account_id = accounts_response.json()[0]["id"]
    
    # Create transaction
    response = client.post(
        "/api/v1/transactions/",
        json={
            "account_id": account_id,
            "amount": 100.00,
            "description": "Test deposit",
            "transaction_type": "deposit",
            "recipient_account": None
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == "100.00"
    assert data["transaction_type"] == "deposit"
    assert "reference_number" in data

def test_get_transactions(test_db):
    """Test getting transactions"""
    # Login
    login_response = client.post("/api/v1/auth/login", data={
        "username": "accountuser",
        "password": "accountpass123"
    })
    token = login_response.json()["access_token"]
    
    # Get transactions
    response = client.get(
        "/api/v1/transactions/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)