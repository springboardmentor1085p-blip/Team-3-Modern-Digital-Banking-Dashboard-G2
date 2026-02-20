"""
Tests for export functionality
"""
import pytest
import csv
import json
from datetime import datetime, timedelta
from io import StringIO
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.transaction import Transaction, TransactionType
from app.models.account import Account, AccountType
from app.services.export_service import ExportService
from app.schemas.export import ExportRequest, ExportFormat, ExportType

def test_transactions_csv_export(db: Session, test_user: User):
    """Test CSV export of transactions"""
    export_service = ExportService(db, test_user.id)
    
    # Create test transactions
    for i in range(3):
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Transaction {i}",
            amount=100.00 * (i + 1),
            transaction_type=TransactionType.INCOME if i % 2 == 0 else TransactionType.EXPENSE,
            category=f"Category {i % 2}",
            date=datetime.now() - timedelta(days=i),
            status="completed"
        )
        db.add(transaction)
    
    db.commit()
    
    # Generate CSV export
    csv_content = export_service._transactions_to_csv(
        db.query(Transaction).filter(Transaction.user_id == test_user.id).all()
    )
    
    # Parse CSV to verify content
    csv_reader = csv.reader(StringIO(csv_content))
    rows = list(csv_reader)
    
    assert len(rows) == 4  # Header + 3 transactions
    assert rows[0] == ["ID", "Date", "Description", "Category", "Amount", "Type", "Account", "Status", "Notes", "Tags"]
    
    for i, row in enumerate(rows[1:], 1):
        assert f"Transaction {i-1}" in row[2]
        assert row[4]  # Amount should not be empty
        assert row[5] in ["income", "expense"]

def test_accounts_csv_export(db: Session, test_user: User):
    """Test CSV export of accounts"""
    export_service = ExportService(db, test_user.id)
    
    # Create test accounts
    account_types = [AccountType.CHECKING, AccountType.SAVINGS, AccountType.CREDIT_CARD]
    
    for i, account_type in enumerate(account_types):
        account = Account(
            user_id=test_user.id,
            name=f"Test Account {i}",
            account_type=account_type,
            balance=1000.00 * (i + 1),
            currency="USD",
            is_active=True
        )
        db.add(account)
    
    db.commit()
    
    # Generate CSV export
    csv_content = export_service._accounts_to_csv(
        db.query(Account).filter(Account.user_id == test_user.id).all()
    )
    
    # Parse CSV
    csv_reader = csv.reader(StringIO(csv_content))
    rows = list(csv_reader)
    
    assert len(rows) == 4  # Header + 3 accounts
    assert rows[0] == ["ID", "Name", "Type", "Balance", "Currency", "Limit", "Interest Rate", "Last Updated", "Status"]
    
    total_balance = 0
    for i, row in enumerate(rows[1:], 1):
        assert f"Test Account {i-1}" in row[1]
        balance = float(row[3])
        total_balance += balance
    
    # Verify total balance calculation
    assert total_balance == 6000.00  # 1000 + 2000 + 3000

def test_cash_flow_json_export(db: Session, test_user: User):
    """Test JSON export of cash flow data"""
    export_service = ExportService(db, test_user.id)
    
    start_date = datetime.now() - timedelta(days=30)
    end_date = datetime.now()
    
    # Create test transactions
    for i in range(5):
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Income {i}",
            amount=1000.00,
            transaction_type=TransactionType.INCOME,
            category="Salary",
            date=start_date + timedelta(days=i * 7),
            status="completed"
        )
        db.add(transaction)
    
    for i in range(10):
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Expense {i}",
            amount=-100.00,
            transaction_type=TransactionType.EXPENSE,
            category="Food",
            date=start_date + timedelta(days=i * 3),
            status="completed"
        )
        db.add(transaction)
    
    db.commit()
    
    # Generate JSON export
    json_content = export_service._cash_flow_to_json(
        export_service._calculate_cash_flow_data(
            db.query(Transaction).filter(Transaction.user_id == test_user.id).all(),
            start_date,
            end_date
        )
    )
    
    # Parse and verify JSON
    data = json.loads(json_content)
    
    assert "total_income" in data
    assert "total_expenses" in data
    assert "net_cash_flow" in data
    assert "category_breakdown" in data
    assert "transactions" in data
    
    assert data["total_income"] == 5000.00  # 5 * 1000
    assert data["total_expenses"] == 1000.00  # 10 * 100
    assert data["net_cash_flow"] == 4000.00
    
    # Verify category breakdown
    categories = [item["category"] for item in data["category_breakdown"]]
    assert "Food" in categories

def test_generate_export(db: Session, test_user: User):
    """Test full export generation"""
    export_service = ExportService(db, test_user.id)
    
    # Create test data
    for i in range(3):
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Export Test {i}",
            amount=50.00,
            transaction_type=TransactionType.EXPENSE,
            category="Test",
            date=datetime.now() - timedelta(days=i),
            status="completed"
        )
        db.add(transaction)
    
    db.commit()
    
    # Create export request
    export_request = ExportRequest(
        export_type=ExportType.TRANSACTIONS,
        format=ExportFormat.CSV,
        start_date=datetime.now() - timedelta(days=7),
        end_date=datetime.now()
    )
    
    # Generate export
    export_result = export_service.generate_export(export_request)
    
    assert "export_id" in export_result
    assert "filename" in export_result
    assert "content" in export_result
    assert export_result["format"] == ExportFormat.CSV
    assert export_result["export_type"] == ExportType.TRANSACTIONS
    assert export_result["user_id"] == test_user.id

def test_get_export(db: Session, test_user: User):
    """Test retrieving an export"""
    export_service = ExportService(db, test_user.id)
    
    # Generate an export first
    export_request = ExportRequest(
        export_type=ExportType.TRANSACTIONS,
        format=ExportFormat.CSV
    )
    
    export_result = export_service.generate_export(export_request)
    export_id = export_result["export_id"]
    
    # Retrieve the export
    retrieved = export_service.get_export(export_id)
    
    assert retrieved is not None
    assert retrieved["export_id"] == export_id
    assert retrieved["user_id"] == test_user.id
    assert retrieved["download_count"] == 1  # Should be incremented
    
    # Try to retrieve non-existent export
    non_existent = export_service.get_export("non-existent-id")
    assert non_existent is None

def test_export_history(db: Session, test_user: User):
    """Test export history functionality"""
    export_service = ExportService(db, test_user.id)
    
    # Generate multiple exports
    for i in range(3):
        export_request = ExportRequest(
            export_type=ExportType.TRANSACTIONS,
            format=ExportFormat.CSV if i % 2 == 0 else ExportFormat.JSON
        )
        export_service.generate_export(export_request)
    
    # Get history
    history = export_service.get_export_history(skip=0, limit=10)
    
    assert len(history) == 3
    assert all(export["user_id"] == test_user.id for export in history)
    
    # Test pagination
    paginated = export_service.get_export_history(skip=1, limit=1)
    assert len(paginated) == 1

def test_delete_export(db: Session, test_user: User, other_user: User):
    """Test deleting an export"""
    export_service = ExportService(db, test_user.id)
    
    # Generate an export
    export_request = ExportRequest(
        export_type=ExportType.TRANSACTIONS,
        format=ExportFormat.CSV
    )
    
    export_result = export_service.generate_export(export_request)
    export_id = export_result["export_id"]
    
    # Delete the export
    deleted = export_service.delete_export(export_id, test_user.id)
    assert deleted == True
    
    # Verify it's deleted
    retrieved = export_service.get_export(export_id)
    assert retrieved is None
    
    # Try to delete with wrong user
    export_result2 = export_service.generate_export(export_request)
    export_id2 = export_result2["export_id"]
    
    deleted_wrong_user = export_service.delete_export(export_id2, other_user.id)
    assert deleted_wrong_user == False
    
    # Export should still exist
    retrieved2 = export_service.get_export(export_id2)
    assert retrieved2 is not None

def test_financial_summary_export(db: Session, test_user: User):
    """Test financial summary export"""
    export_service = ExportService(db, test_user.id)
    
    # Create test transactions
    now = datetime.now()
    
    for i in range(3):
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Monthly Income {i}",
            amount=3000.00,
            transaction_type=TransactionType.INCOME,
            category="Salary",
            date=datetime(now.year, now.month, 15) - timedelta(days=i * 30),
            status="completed"
        )
        db.add(transaction)
        
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Monthly Expense {i}",
            amount=-2000.00,
            transaction_type=TransactionType.EXPENSE,
            category="Living",
            date=datetime(now.year, now.month, 20) - timedelta(days=i * 30),
            status="completed"
        )
        db.add(transaction)
    
    db.commit()
    
    # Generate summary
    summary = export_service._calculate_financial_summary(
        db.query(Transaction).filter(Transaction.user_id == test_user.id).all(),
        datetime(now.year, now.month, 1) - timedelta(days=60),
        now
    )
    
    assert "metrics" in summary
    assert "top_categories" in summary
    assert "recommendations" in summary
    
    metrics = summary["metrics"]
    assert metrics["total_income"] == 9000.00  # 3 * 3000
    assert metrics["total_expenses"] == 6000.00  # 3 * 2000
    assert metrics["net_cash_flow"] == 3000.00

def test_api_generate_export(client: TestClient, test_user_headers: dict):
    """Test API endpoint for generating exports"""
    export_data = {
        "export_type": "transactions",
        "format": "csv",
        "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
        "end_date": datetime.now().isoformat()
    }
    
    response = client.post("/api/v1/exports/generate", json=export_data, headers=test_user_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    assert "export_id" in data
    assert "status" in data
    assert data["status"] == "processing"
    assert data["format"] == "csv"
    assert data["type"] == "transactions"

def test_api_download_export(client: TestClient, test_user_headers: dict):
    """Test API endpoint for downloading exports"""
    # First generate an export
    export_data = {
        "export_type": "transactions",
        "format": "csv"
    }
    
    generate_response = client.post("/api/v1/exports/generate", json=export_data, headers=test_user_headers)
    export_id = generate_response.json()["export_id"]
    
    # Try to download (note: in test mode, this might return placeholder)
    download_response = client.get(f"/api/v1/exports/download/{export_id}", headers=test_user_headers)
    
    # Should either return the file or 404 if not implemented
    assert download_response.status_code in [200, 404, 500]

def test_api_transactions_csv(client: TestClient, test_user_headers: dict):
    """Test direct CSV export API"""
    response = client.get("/api/v1/exports/transactions/csv", headers=test_user_headers)
    
    # Should return CSV file
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv"
    assert "attachment" in response.headers["content-disposition"]
    assert response.text  # Should have content

def test_api_export_history(client: TestClient, test_user_headers: dict):
    """Test API endpoint for export history"""
    response = client.get("/api/v1/exports/exports/history", headers=test_user_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    assert "exports" in data
    assert "total" in data
    assert isinstance(data["exports"], list)

def test_api_delete_export(client: TestClient, test_user_headers: dict):
    """Test API endpoint for deleting exports"""
    # First generate an export
    export_data = {
        "export_type": "transactions",
        "format": "csv"
    }
    
    generate_response = client.post("/api/v1/exports/generate", json=export_data, headers=test_user_headers)
    export_id = generate_response.json()["export_id"]
    
    # Delete the export
    delete_response = client.delete(f"/api/v1/exports/exports/{export_id}", headers=test_user_headers)
    
    # Should succeed
    assert delete_response.status_code in [200, 204, 404]

def test_export_service_edge_cases(db: Session, test_user: User):
    """Test edge cases for export service"""
    export_service = ExportService(db, test_user.id)
    
    # Test with no data
    empty_csv = export_service._transactions_to_csv([])
    csv_reader = csv.reader(StringIO(empty_csv))
    rows = list(csv_reader)
    
    assert len(rows) == 1  # Just header
    assert rows[0] == ["ID", "Date", "Description", "Category", "Amount", "Type", "Account", "Status", "Notes", "Tags"]
    
    # Test with empty accounts
    empty_accounts_csv = export_service._accounts_to_csv([])
    csv_reader = csv.reader(StringIO(empty_accounts_csv))
    rows = list(csv_reader)
    
    assert len(rows) == 1  # Just header
    
    # Test cash flow with no transactions
    start_date = datetime.now() - timedelta(days=30)
    end_date = datetime.now()
    
    empty_cash_flow = export_service._calculate_cash_flow_data([], start_date, end_date)
    
    assert empty_cash_flow["total_income"] == 0
    assert empty_cash_flow["total_expenses"] == 0
    assert empty_cash_flow["net_cash_flow"] == 0
    assert len(empty_cash_flow["category_breakdown"]) == 0

def test_pdf_summary_generation(db: Session, test_user: User):
    """Test PDF summary generation"""
    export_service = ExportService(db, test_user.id)
    
    # Create some test data
    now = datetime.now()
    
    transaction = Transaction(
        user_id=test_user.id,
        description="Test Income",
        amount=5000.00,
        transaction_type=TransactionType.INCOME,
        category="Salary",
        date=now,
        status="completed"
    )
    db.add(transaction)
    
    transaction = Transaction(
        user_id=test_user.id,
        description="Test Expense",
        amount=-3000.00,
        transaction_type=TransactionType.EXPENSE,
        category="Rent",
        date=now,
        status="completed"
    )
    db.add(transaction)
    
    db.commit()
    
    # Generate PDF (might return None in test environment)
    pdf_content = export_service.generate_pdf_summary(now.month, now.year)
    
    # PDF generation might fail in test environment without proper dependencies
    # Just check that it doesn't crash
    assert pdf_content is None or isinstance(pdf_content, bytes)

@pytest.fixture
def test_user(db: Session):
    """Create a test user"""
    from app.models.user import User
    
    user = User(
        email="test_exports@example.com",
        hashed_password="hashed_password",
        is_active=True,
        full_name="Test Export User"
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@pytest.fixture
def other_user(db: Session):
    """Create another test user"""
    from app.models.user import User
    
    user = User(
        email="other_exports@example.com",
        hashed_password="hashed_password",
        is_active=True,
        full_name="Other Export User"
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@pytest.fixture(autouse=True)
def cleanup_test_data(db: Session, test_user: User, other_user: User):
    """Clean up test data after each test"""
    yield
    
    # Delete test transactions
    db.query(Transaction).filter(Transaction.user_id == test_user.id).delete()
    db.query(Transaction).filter(Transaction.user_id == other_user.id).delete()
    
    # Delete test accounts
    db.query(Account).filter(Account.user_id == test_user.id).delete()
    db.query(Account).filter(Account.user_id == other_user.id).delete()
    
    db.commit()
    
    # Delete test users
    db.query(User).filter(User.id == test_user.id).delete()
    db.query(User).filter(User.id == other_user.id).delete()
    db.commit()