import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import Base, get_db
from app.models.bill import Bill, BillFrequency, CurrencyCode
from app.models.user import User
from app.schemas.bill import BillCreate, BillUpdate
from app.crud.bill import bill_crud
from app.core.auth import create_access_token, verify_password, get_password_hash
from app.tests.conftest import TestingSessionLocal, override_get_db

client = TestClient(app)

# Test data
TEST_USER_DATA = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpassword123",
    "full_name": "Test User"
}

TEST_BILL_DATA = {
    "name": "Electricity Bill",
    "description": "Monthly electricity bill",
    "amount": Decimal("150.50"),
    "currency": CurrencyCode.USD,
    "due_date": date.today() + timedelta(days=10),
    "category": "utilities",
    "frequency": BillFrequency.MONTHLY,
    "reminder_days": 3
}

@pytest.fixture
def test_user(db: Session):
    """Create a test user"""
    user = User(
        username=TEST_USER_DATA["username"],
        email=TEST_USER_DATA["email"],
        hashed_password=get_password_hash(TEST_USER_DATA["password"]),
        full_name=TEST_USER_DATA["full_name"],
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers"""
    access_token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture
def test_bill(db: Session, test_user):
    """Create a test bill"""
    bill_data = TEST_BILL_DATA.copy()
    bill_data["amount_usd"] = bill_data["amount"]  # Same for USD
    bill = Bill(**bill_data, user_id=test_user.id)
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill

class TestBillAPI:
    """Test cases for Bill API endpoints"""
    
    def test_create_bill_success(self, db: Session, test_user, auth_headers):
        """Test creating a new bill"""
        bill_data = TEST_BILL_DATA.copy()
        bill_data["due_date"] = str(bill_data["due_date"])
        bill_data["amount"] = str(bill_data["amount"])
        
        response = client.post(
            "/api/v1/bills/",
            json=bill_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["name"] == bill_data["name"]
        assert data["amount"] == bill_data["amount"]
        assert data["currency"] == bill_data["currency"]
        assert data["user_id"] == test_user.id
        assert data["is_paid"] == False
        
        # Verify bill was created in database
        bill = db.query(Bill).filter(Bill.id == data["id"]).first()
        assert bill is not None
        assert bill.name == bill_data["name"]
    
    def test_create_bill_with_currency_conversion(self, db: Session, test_user, auth_headers):
        """Test creating bill with non-USD currency"""
        with patch('app.services.currency_service.convert_currency') as mock_convert:
            mock_convert.return_value = Decimal("135.45")  # Mock conversion rate
            
            bill_data = {
                "name": "International Bill",
                "amount": "100.00",
                "currency": "EUR",
                "due_date": str(date.today() + timedelta(days=15)),
                "category": "subscription",
                "frequency": "monthly"
            }
            
            response = client.post(
                "/api/v1/bills/",
                json=bill_data,
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = response.json()
            
            # Verify conversion was called
            mock_convert.assert_called_once()
            
            # Verify USD amount is stored
            assert data["amount_usd"] == "135.45"
    
    def test_create_bill_invalid_data(self, db: Session, test_user, auth_headers):
        """Test creating bill with invalid data"""
        # Test with past due date
        bill_data = {
            "name": "Past Due Bill",
            "amount": "100.00",
            "currency": "USD",
            "due_date": str(date.today() - timedelta(days=1)),
            "category": "utilities",
            "frequency": "monthly"
        }
        
        response = client.post(
            "/api/v1/bills/",
            json=bill_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
        
        # Test with negative amount
        bill_data["due_date"] = str(date.today() + timedelta(days=10))
        bill_data["amount"] = "-50.00"
        
        response = client.post(
            "/api/v1/bills/",
            json=bill_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422
    
    def test_get_bills(self, db: Session, test_user, auth_headers, test_bill):
        """Test retrieving bills"""
        response = client.get(
            "/api/v1/bills/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify test bill is in response
        bill_ids = [bill["id"] for bill in data]
        assert test_bill.id in bill_ids
    
    def test_get_bills_with_filters(self, db: Session, test_user, auth_headers, test_bill):
        """Test retrieving bills with filters"""
        # Create another bill with different category
        other_bill = Bill(
            name="Rent",
            amount=Decimal("1200.00"),
            currency=CurrencyCode.USD,
            amount_usd=Decimal("1200.00"),
            due_date=date.today() + timedelta(days=5),
            category="rent",
            user_id=test_user.id
        )
        db.add(other_bill)
        db.commit()
        
        # Filter by category
        response = client.get(
            "/api/v1/bills/?category=utilities",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 1
        assert data[0]["category"] == "utilities"
        
        # Filter by is_paid
        response = client.get(
            "/api/v1/bills/?is_paid=false",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert all(bill["is_paid"] == False for bill in data)
    
    def test_get_bill_by_id(self, db: Session, test_user, auth_headers, test_bill):
        """Test retrieving a specific bill"""
        response = client.get(
            f"/api/v1/bills/{test_bill.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == test_bill.id
        assert data["name"] == test_bill.name
        assert data["user_id"] == test_user.id
    
    def test_get_bill_not_found(self, db: Session, test_user, auth_headers):
        """Test retrieving non-existent bill"""
        response = client.get(
            "/api/v1/bills/999999",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    def test_get_bill_unauthorized(self, db: Session, test_user, auth_headers):
        """Test retrieving another user's bill"""
        # Create another user
        other_user = User(
            username="otheruser",
            email="other@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=True
        )
        db.add(other_user)
        db.commit()
        
        # Create bill for other user
        other_bill = Bill(
            name="Other User Bill",
            amount=Decimal("100.00"),
            currency=CurrencyCode.USD,
            amount_usd=Decimal("100.00"),
            due_date=date.today() + timedelta(days=10),
            category="utilities",
            user_id=other_user.id
        )
        db.add(other_bill)
        db.commit()
        
        response = client.get(
            f"/api/v1/bills/{other_bill.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 403
    
    def test_update_bill(self, db: Session, test_user, auth_headers, test_bill):
        """Test updating a bill"""
        update_data = {
            "name": "Updated Electricity Bill",
            "amount": "175.75",
            "due_date": str(date.today() + timedelta(days=15))
        }
        
        response = client.put(
            f"/api/v1/bills/{test_bill.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == update_data["name"]
        assert data["amount"] == update_data["amount"]
        
        # Verify update in database
        db.refresh(test_bill)
        assert test_bill.name == update_data["name"]
        assert test_bill.amount == Decimal(update_data["amount"])
    
    def test_update_bill_mark_as_paid(self, db: Session, test_user, auth_headers, test_bill):
        """Test marking a bill as paid"""
        update_data = {"is_paid": True}
        
        response = client.put(
            f"/api/v1/bills/{test_bill.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_paid"] == True
        assert data["paid_date"] is not None
        
        # Verify in database
        db.refresh(test_bill)
        assert test_bill.is_paid == True
        assert test_bill.paid_date == date.today()
    
    def test_delete_bill(self, db: Session, test_user, auth_headers, test_bill):
        """Test deleting a bill"""
        response = client.delete(
            f"/api/v1/bills/{test_bill.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 204
        
        # Verify deletion from database
        bill = db.query(Bill).filter(Bill.id == test_bill.id).first()
        assert bill is None
    
    def test_get_due_soon_bills(self, db: Session, test_user, auth_headers):
        """Test getting bills due soon"""
        # Create bills with different due dates
        bills = [
            Bill(
                name=f"Bill {i}",
                amount=Decimal("100.00"),
                currency=CurrencyCode.USD,
                amount_usd=Decimal("100.00"),
                due_date=date.today() + timedelta(days=i),
                category="utilities",
                user_id=test_user.id
            )
            for i in range(1, 11)
        ]
        
        for bill in bills:
            db.add(bill)
        db.commit()
        
        response = client.get(
            "/api/v1/bills/summary/due-soon?days=7",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should get bills due in next 7 days (days 1-7)
        assert len(data) == 7
        
        # Verify dates are in range
        for bill in data:
            due_date = datetime.fromisoformat(bill["due_date"]).date()
            days_until = (due_date - date.today()).days
            assert 1 <= days_until <= 7
    
    def test_get_monthly_summary(self, db: Session, test_user, auth_headers):
        """Test getting monthly bill summary"""
        today = date.today()
        
        # Create bills for current month
        bills = [
            Bill(
                name="Paid Bill",
                amount=Decimal("100.00"),
                currency=CurrencyCode.USD,
                amount_usd=Decimal("100.00"),
                due_date=today,
                category="utilities",
                is_paid=True,
                paid_date=today,
                user_id=test_user.id
            ),
            Bill(
                name="Unpaid Bill",
                amount=Decimal("200.00"),
                currency=CurrencyCode.USD,
                amount_usd=Decimal("200.00"),
                due_date=today,
                category="rent",
                is_paid=False,
                user_id=test_user.id
            )
        ]
        
        for bill in bills:
            db.add(bill)
        db.commit()
        
        response = client.get(
            f"/api/v1/bills/summary/monthly?month={today.month}&year={today.year}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_bills"] == 2
        assert data["total_amount"] == "300.00"
        assert data["paid_bills"] == 1
        assert data["unpaid_bills"] == 1
        assert len(data["category_breakdown"]) == 2
    
    def test_mark_bill_as_paid_endpoint(self, db: Session, test_user, auth_headers, test_bill):
        """Test the mark as paid endpoint"""
        response = client.post(
            f"/api/v1/bills/{test_bill.id}/pay",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_paid"] == True
        assert data["paid_date"] is not None
        
        # Verify in database
        db.refresh(test_bill)
        assert test_bill.is_paid == True

class TestBillCRUD:
    """Test cases for Bill CRUD operations"""
    
    def test_create_bill(self, db: Session, test_user):
        """Test creating a bill via CRUD"""
        bill_data = TEST_BILL_DATA.copy()
        bill_data["amount_usd"] = bill_data["amount"]  # Same for USD
        
        bill = bill_crud.create(
            db=db,
            obj_in=bill_data,
            user_id=test_user.id
        )
        
        assert bill.id is not None
        assert bill.user_id == test_user.id
        assert bill.name == bill_data["name"]
        assert bill.amount == bill_data["amount"]
        assert not bill.is_paid
    
    def test_get_bill(self, db: Session, test_bill):
        """Test getting a bill via CRUD"""
        bill = bill_crud.get(db=db, id=test_bill.id)
        
        assert bill is not None
        assert bill.id == test_bill.id
        assert bill.name == test_bill.name
    
    def test_get_multi_bills(self, db: Session, test_user):
        """Test getting multiple bills via CRUD"""
        # Create multiple bills
        for i in range(5):
            bill = Bill(
                name=f"Test Bill {i}",
                amount=Decimal("100.00"),
                currency=CurrencyCode.USD,
                amount_usd=Decimal("100.00"),
                due_date=date.today() + timedelta(days=i),
                category="utilities",
                user_id=test_user.id
            )
            db.add(bill)
        db.commit()
        
        bills = bill_crud.get_multi(
            db=db,
            skip=0,
            limit=10,
            filters={"user_id": test_user.id}
        )
        
        assert len(bills) >= 5
    
    def test_update_bill(self, db: Session, test_bill):
        """Test updating a bill via CRUD"""
        update_data = {
            "name": "Updated Bill Name",
            "amount": Decimal("200.00"),
            "is_paid": True
        }
        
        updated_bill = bill_crud.update(
            db=db,
            db_obj=test_bill,
            obj_in=update_data
        )
        
        assert updated_bill.name == update_data["name"]
        assert updated_bill.amount == update_data["amount"]
        assert updated_bill.is_paid == update_data["is_paid"]
        assert updated_bill.paid_date == date.today()
    
    def test_delete_bill(self, db: Session, test_bill):
        """Test deleting a bill via CRUD"""
        bill_id = test_bill.id
        
        deleted_bill = bill_crud.remove(db=db, id=bill_id)
        
        assert deleted_bill.id == bill_id
        
        # Verify it's deleted
        bill = bill_crud.get(db=db, id=bill_id)
        assert bill is None
    
    def test_get_due_soon(self, db: Session, test_user):
        """Test getting due soon bills via CRUD"""
        today = date.today()
        
        # Create bills with different due dates
        bills = []
        for days in [1, 3, 7, 10, 14]:
            bill = Bill(
                name=f"Bill due in {days} days",
                amount=Decimal("100.00"),
                currency=CurrencyCode.USD,
                amount_usd=Decimal("100.00"),
                due_date=today + timedelta(days=days),
                category="utilities",
                user_id=test_user.id
            )
            db.add(bill)
            bills.append(bill)
        db.commit()
        
        # Get bills due in next 7 days
        due_soon = bill_crud.get_due_soon(
            db=db,
            user_id=test_user.id,
            start_date=today,
            end_date=today + timedelta(days=7)
        )
        
        # Should get bills due in 1, 3, and 7 days
        assert len(due_soon) == 3
        
        # Verify they're not paid
        assert all(not bill.is_paid for bill in due_soon)
    
    def test_get_overdue_bills(self, db: Session, test_user):
        """Test getting overdue bills via CRUD"""
        today = date.today()
        
        # Create overdue bill
        overdue_bill = Bill(
            name="Overdue Bill",
            amount=Decimal("100.00"),
            currency=CurrencyCode.USD,
            amount_usd=Decimal("100.00"),
            due_date=today - timedelta(days=5),
            category="utilities",
            user_id=test_user.id
        )
        db.add(overdue_bill)
        db.commit()
        
        overdue_bills = bill_crud.get_overdue(db=db, user_id=test_user.id)
        
        assert len(overdue_bills) == 1
        assert overdue_bills[0].id == overdue_bill.id
        assert overdue_bills[0].is_overdue == True
    
    def test_get_monthly_summary(self, db: Session, test_user):
        """Test getting monthly summary via CRUD"""
        today = date.today()
        
        # Create bills for current month
        bill1 = Bill(
            name="Paid Bill",
            amount=Decimal("150.00"),
            currency=CurrencyCode.USD,
            amount_usd=Decimal("150.00"),
            due_date=today,
            category="utilities",
            is_paid=True,
            paid_date=today,
            user_id=test_user.id
        )
        
        bill2 = Bill(
            name="Unpaid Bill",
            amount=Decimal("250.00"),
            currency=CurrencyCode.USD,
            amount_usd=Decimal("250.00"),
            due_date=today,
            category="rent",
            is_paid=False,
            user_id=test_user.id
        )
        
        db.add_all([bill1, bill2])
        db.commit()
        
        summary = bill_crud.get_monthly_summary(
            db=db,
            user_id=test_user.id,
            month=today.month,
            year=today.year
        )
        
        assert summary["total_bills"] == 2
        assert summary["total_amount"] == Decimal("400.00")
        assert summary["paid_bills"] == 1
        assert summary["unpaid_bills"] == 1
        assert len(summary["category_breakdown"]) == 2
        
        # Verify category breakdown
        categories = {item["category"] for item in summary["category_breakdown"]}
        assert "utilities" in categories
        assert "rent" in categories

class TestBillModels:
    """Test cases for Bill model properties"""
    
    def test_bill_properties(self, test_bill):
        """Test bill calculated properties"""
        # Test days_until_due
        assert test_bill.days_until_due == (test_bill.due_date - date.today()).days
        
        # Test is_overdue (should be False for future due date)
        assert test_bill.is_overdue == False
        
        # Test should_remind (depends on reminder_days)
        if test_bill.reminder_days > 0:
            reminder_date = test_bill.due_date - timedelta(days=test_bill.reminder_days)
            assert test_bill.should_remind == (date.today() >= reminder_date)
    
    def test_bill_to_dict(self, test_bill):
        """Test bill to_dict method"""
        bill_dict = test_bill.to_dict()
        
        assert isinstance(bill_dict, dict)
        assert bill_dict["id"] == test_bill.id
        assert bill_dict["name"] == test_bill.name
        assert bill_dict["amount"] == float(test_bill.amount)
        assert "days_until_due" in bill_dict
        assert "is_overdue" in bill_dict
        assert "should_remind" in bill_dict
    
    def test_overdue_bill(self, db: Session, test_user):
        """Test bill marked as overdue"""
        overdue_bill = Bill(
            name="Overdue Bill",
            amount=Decimal("100.00"),
            currency=CurrencyCode.USD,
            amount_usd=Decimal("100.00"),
            due_date=date.today() - timedelta(days=5),
            category="utilities",
            user_id=test_user.id
        )
        
        assert overdue_bill.is_overdue == True
        assert overdue_bill.days_until_due < 0
    
    def test_paid_bill_properties(self, db: Session, test_user):
        """Test properties of paid bill"""
        paid_bill = Bill(
            name="Paid Bill",
            amount=Decimal("100.00"),
            currency=CurrencyCode.USD,
            amount_usd=Decimal("100.00"),
            due_date=date.today() - timedelta(days=5),
            category="utilities",
            is_paid=True,
            paid_date=date.today() - timedelta(days=2),
            user_id=test_user.id
        )
        
        # Paid bills should not be considered overdue
        assert paid_bill.is_overdue == False
        # Should not remind for paid bills
        assert paid_bill.should_remind == False

if __name__ == "__main__":
    pytest.main([__file__, "-v"])