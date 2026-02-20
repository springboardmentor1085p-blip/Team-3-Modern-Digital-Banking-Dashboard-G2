"""
Tests for alerts functionality
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.alert import Alert, AlertType, AlertStatus, EntityType
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertUpdate
from app.crud.alert import CRUDAlert
from app.services.alert_service import AlertService

def test_create_alert(db: Session, test_user: User):
    """Test creating an alert"""
    crud_alert = CRUDAlert(Alert)
    
    alert_data = AlertCreate(
        alert_type=AlertType.INFO,
        title="Test Alert",
        message="This is a test alert",
        severity="info",
        entity_type=EntityType.TRANSACTION,
        entity_id=123,
        is_actionable=True
    )
    
    alert = crud_alert.create_user_alert(
        db,
        user_id=test_user.id,
        alert_type=alert_data.alert_type,
        title=alert_data.title,
        message=alert_data.message,
        severity=alert_data.severity,
        entity_type=alert_data.entity_type,
        entity_id=alert_data.entity_id,
        is_actionable=alert_data.is_actionable
    )
    
    assert alert.id is not None
    assert alert.user_id == test_user.id
    assert alert.title == "Test Alert"
    assert alert.alert_type == AlertType.INFO
    assert alert.status == AlertStatus.ACTIVE
    assert alert.is_read == False

def test_get_alerts(db: Session, test_user: User):
    """Test getting alerts for a user"""
    crud_alert = CRUDAlert(Alert)
    
    # Create test alerts
    for i in range(5):
        crud_alert.create_user_alert(
            db,
            user_id=test_user.id,
            alert_type=AlertType.INFO,
            title=f"Alert {i}",
            message=f"Test message {i}",
            severity="info"
        )
    
    # Get alerts
    alerts = crud_alert.get_by_user(db, user_id=test_user.id)
    
    assert len(alerts) == 5
    assert all(alert.user_id == test_user.id for alert in alerts)

def test_mark_alert_as_read(db: Session, test_user: User):
    """Test marking an alert as read"""
    crud_alert = CRUDAlert(Alert)
    
    # Create alert
    alert = crud_alert.create_user_alert(
        db,
        user_id=test_user.id,
        alert_type=AlertType.INFO,
        title="Test Alert",
        message="Test message",
        severity="info"
    )
    
    assert alert.is_read == False
    
    # Mark as read
    updated_alert = crud_alert.mark_as_read(db, alert_id=alert.id, user_id=test_user.id)
    
    assert updated_alert is not None
    assert updated_alert.is_read == True
    assert updated_alert.acknowledged_at is not None

def test_mark_all_alerts_read(db: Session, test_user: User):
    """Test marking all alerts as read"""
    crud_alert = CRUDAlert(Alert)
    
    # Create multiple alerts
    for i in range(3):
        crud_alert.create_user_alert(
            db,
            user_id=test_user.id,
            alert_type=AlertType.INFO,
            title=f"Alert {i}",
            message=f"Test message {i}",
            severity="info"
        )
    
    # Mark all as read
    updated_count = crud_alert.mark_all_as_read(db, user_id=test_user.id)
    
    assert updated_count == 3
    
    # Verify all alerts are read
    alerts = crud_alert.get_by_user(db, user_id=test_user.id, unread_only=True)
    assert len(alerts) == 0

def test_alert_stats(db: Session, test_user: User):
    """Test getting alert statistics"""
    crud_alert = CRUDAlert(Alert)
    
    # Create alerts with different types and statuses
    alert_types = [AlertType.INFO, AlertType.WARNING, AlertType.CRITICAL]
    
    for i, alert_type in enumerate(alert_types):
        alert = crud_alert.create_user_alert(
            db,
            user_id=test_user.id,
            alert_type=alert_type,
            title=f"Alert {i}",
            message=f"Test message {i}",
            severity="info" if alert_type == AlertType.INFO else "warning"
        )
        
        # Mark some as read
        if i % 2 == 0:
            alert.is_read = True
            db.add(alert)
    
    db.commit()
    
    # Get stats
    stats = crud_alert.get_stats(db, user_id=test_user.id)
    
    assert stats["total_alerts"] == 3
    assert "by_type" in stats
    assert "by_severity" in stats
    assert stats["unread_count"] == 1  # One alert should be unread

def test_alert_service_check_large_transactions(db: Session, test_user: User, test_transaction):
    """Test alert service detection of large transactions"""
    alert_service = AlertService(db, test_user.id)
    
    # Create a large transaction
    test_transaction.amount = 1500.00  # Large amount
    test_transaction.transaction_type = "expense"
    db.add(test_transaction)
    db.commit()
    
    # Check for large transactions
    alerts = alert_service._check_large_transactions(threshold=1000.0)
    
    assert len(alerts) > 0
    assert alerts[0].alert_type == AlertType.LARGE_TRANSACTION
    assert alerts[0].amount == 1500.00

def test_alert_service_check_budget_exceeded(db: Session, test_user: User, test_budget):
    """Test alert service detection of exceeded budgets"""
    alert_service = AlertService(db, test_user.id)
    
    # Create transaction that exceeds budget
    from app.models.transaction import Transaction
    
    transaction = Transaction(
        user_id=test_user.id,
        description="Large expense",
        amount=-600.00,  # Exceeds budget of 500
        transaction_type="expense",
        category=test_budget.category,
        date=datetime.now(),
        status="completed"
    )
    
    db.add(transaction)
    db.commit()
    
    # Check for exceeded budget
    alerts = alert_service._check_budget_exceeded(threshold_percentage=90.0)
    
    # Should create an alert for exceeded budget
    assert len(alerts) > 0
    assert alerts[0].alert_type == AlertType.BUDGET_EXCEEDED
    assert "exceeded" in alerts[0].title.lower()

def test_alert_service_generate_test_alerts(db: Session, test_user: User):
    """Test generating test alerts"""
    alert_service = AlertService(db, test_user.id)
    
    # Generate test alerts
    test_alerts = alert_service.generate_test_alerts(count=3)
    
    assert len(test_alerts) == 3
    assert all(alert.user_id == test_user.id for alert in test_alerts)
    assert all("Test Alert" in alert.title for alert in test_alerts)

def test_alert_api_get_alerts(client: TestClient, test_user_headers: dict):
    """Test API endpoint for getting alerts"""
    response = client.get("/api/v1/alerts/", headers=test_user_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert "total" in data

def test_alert_api_create_alert(client: TestClient, test_user_headers: dict):
    """Test API endpoint for creating an alert"""
    alert_data = {
        "alert_type": "info",
        "title": "API Test Alert",
        "message": "Created via API",
        "severity": "info",
        "is_actionable": True
    }
    
    response = client.post("/api/v1/alerts/", json=alert_data, headers=test_user_headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "API Test Alert"
    assert data["user_id"] is not None

def test_alert_api_mark_as_read(client: TestClient, test_user_headers: dict, test_alert: Alert):
    """Test API endpoint for marking alert as read"""
    # First create an alert
    alert_id = test_alert.id
    
    # Mark as read
    update_data = {"is_read": True}
    response = client.patch(f"/api/v1/alerts/{alert_id}", json=update_data, headers=test_user_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["is_read"] == True

def test_alert_api_delete_alert(client: TestClient, test_user_headers: dict, test_alert: Alert):
    """Test API endpoint for deleting an alert"""
    alert_id = test_alert.id
    
    response = client.delete(f"/api/v1/alerts/{alert_id}", headers=test_user_headers)
    
    assert response.status_code == 204
    
    # Verify alert is deleted
    response = client.get(f"/api/v1/alerts/{alert_id}", headers=test_user_headers)
    assert response.status_code == 404

def test_alert_api_stats(client: TestClient, test_user_headers: dict):
    """Test API endpoint for alert statistics"""
    response = client.get("/api/v1/alerts/stats/summary", headers=test_user_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "total_alerts" in data
    assert "unread_count" in data
    assert "by_type" in data

def test_alert_cleanup_expired(db: Session, test_user: User):
    """Test cleanup of expired alerts"""
    crud_alert = CRUDAlert(Alert)
    
    # Create an expired alert
    alert = crud_alert.create_user_alert(
        db,
        user_id=test_user.id,
        alert_type=AlertType.INFO,
        title="Expired Alert",
        message="This alert has expired",
        severity="info",
        expires_at=datetime.now() - timedelta(days=1)
    )
    
    # Cleanup expired alerts
    cleaned_count = crud_alert.cleanup_expired(db, user_id=test_user.id)
    
    assert cleaned_count >= 1
    
    # Verify alert was archived
    db.refresh(alert)
    assert alert.status == AlertStatus.ARCHIVED
    assert alert.is_read == True

def test_alert_duplicate_prevention(db: Session, test_user: User):
    """Test prevention of duplicate alerts"""
    crud_alert = CRUDAlert(Alert)
    
    # Create first alert
    alert1 = crud_alert.create_user_alert(
        db,
        user_id=test_user.id,
        alert_type=AlertType.LARGE_TRANSACTION,
        title="Duplicate Test",
        message="First alert",
        severity="warning",
        entity_type=EntityType.TRANSACTION,
        entity_id=999
    )
    
    # Try to create duplicate alert (same type, entity, within 24 hours)
    existing = crud_alert.get_by_criteria(
        db,
        user_id=test_user.id,
        alert_type=AlertType.LARGE_TRANSACTION,
        entity_type=EntityType.TRANSACTION,
        entity_id=999,
        created_after=datetime.now() - timedelta(hours=24)
    )
    
    assert existing is not None
    assert existing.id == alert1.id

def test_alert_bulk_update(db: Session, test_user: User):
    """Test bulk update of alerts"""
    crud_alert = CRUDAlert(Alert)
    
    # Create multiple alerts
    alert_ids = []
    for i in range(3):
        alert = crud_alert.create_user_alert(
            db,
            user_id=test_user.id,
            alert_type=AlertType.INFO,
            title=f"Alert {i}",
            message=f"Test {i}",
            severity="info"
        )
        alert_ids.append(alert.id)
    
    # Bulk update to mark as read
    update_data = {"is_read": True}
    updated_count = crud_alert.bulk_update(
        db,
        alert_ids=alert_ids,
        update_data=update_data,
        user_id=test_user.id
    )
    
    assert updated_count == 3
    
    # Verify updates
    alerts = crud_alert.get_by_user(db, user_id=test_user.id)
    for alert in alerts:
        if alert.id in alert_ids:
            assert alert.is_read == True

@pytest.fixture
def test_alert(db: Session, test_user: User) -> Alert:
    """Create a test alert"""
    crud_alert = CRUDAlert(Alert)
    
    alert = crud_alert.create_user_alert(
        db,
        user_id=test_user.id,
        alert_type=AlertType.INFO,
        title="Test Alert",
        message="This is a test alert",
        severity="info"
    )
    
    return alert

@pytest.fixture
def test_transaction(db: Session, test_user: User):
    """Create a test transaction"""
    from app.models.transaction import Transaction
    
    transaction = Transaction(
        user_id=test_user.id,
        description="Test Transaction",
        amount=100.00,
        transaction_type="expense",
        category="Test Category",
        date=datetime.now(),
        status="completed"
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return transaction

@pytest.fixture
def test_budget(db: Session, test_user: User):
    """Create a test budget"""
    from app.models.budget import Budget
    
    budget = Budget(
        user_id=test_user.id,
        category="Test Category",
        amount=500.00,
        start_date=datetime.now().date(),
        end_date=(datetime.now() + timedelta(days=30)).date(),
        is_active=True
    )
    
    db.add(budget)
    db.commit()
    db.refresh(budget)
    
    return budget