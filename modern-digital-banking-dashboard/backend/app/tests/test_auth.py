import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_register_user(test_db):
    """Test user registration"""
    response = client.post("/api/v1/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "full_name": "Test User"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_login_user(test_db):
    """Test user login"""
    # First register a user
    client.post("/api/v1/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "loginpass123",
        "full_name": "Login User"
    })
    
    # Then login
    response = client.post("/api/v1/auth/login", data={
        "username": "loginuser",
        "password": "loginpass123"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(test_db):
    """Test login with invalid credentials"""
    response = client.post("/api/v1/auth/login", data={
        "username": "nonexistent",
        "password": "wrongpass"
    })
    
    assert response.status_code == 401

def test_register_duplicate_username(test_db):
    """Test registering with duplicate username"""
    # First registration
    client.post("/api/v1/auth/register", json={
        "username": "duplicate",
        "email": "first@example.com",
        "password": "testpass123",
        "full_name": "First User"
    })
    
    # Second registration with same username
    response = client.post("/api/v1/auth/register", json={
        "username": "duplicate",
        "email": "second@example.com",
        "password": "testpass123",
        "full_name": "Second User"
    })
    
    assert response.status_code == 400  