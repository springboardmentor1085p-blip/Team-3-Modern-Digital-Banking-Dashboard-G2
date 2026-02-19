"""
Tests for insights and analytics functionality
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.transaction import Transaction, TransactionType
from app.services.insight_service import InsightService

def test_cash_flow_insights(db: Session, test_user: User):
    """Test cash flow insights calculation"""
    insight_service = InsightService(db, test_user.id)
    
    # Create test transactions
    start_date = datetime.now() - timedelta(days=30)
    end_date = datetime.now()
    
    # Add income transactions
    for i in range(3):
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Salary {i}",
            amount=1000.00,
            transaction_type=TransactionType.INCOME,
            category="Salary",
            date=start_date + timedelta(days=i * 10),
            status="completed"
        )
        db.add(transaction)
    
    # Add expense transactions
    for i in range(5):
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Expense {i}",
            amount=-100.00,
            transaction_type=TransactionType.EXPENSE,
            category="Food",
            date=start_date + timedelta(days=i * 7),
            status="completed"
        )
        db.add(transaction)
    
    db.commit()
    
    # Get insights
    insights = insight_service.get_cash_flow_insights(start_date, end_date)
    
    assert insights.total_income == 3000.00
    assert insights.total_expenses == 500.00
    assert insights.net_cash_flow == 2500.00
    assert insights.income_transaction_count == 3
    assert insights.expense_transaction_count == 5
    assert insights.savings_rate == (2500.00 / 3000.00) * 100

def test_category_breakdown(db: Session, test_user: User):
    """Test category breakdown calculation"""
    insight_service = InsightService(db, test_user.id)
    
    # Create test transactions with different categories
    start_date = datetime.now() - timedelta(days=30)
    end_date = datetime.now()
    
    categories = {
        "Food": 300.00,
        "Transportation": 200.00,
        "Entertainment": 100.00
    }
    
    for category, amount in categories.items():
        for i in range(2):
            transaction = Transaction(
                user_id=test_user.id,
                description=f"{category} expense {i}",
                amount=-amount / 2,
                transaction_type=TransactionType.EXPENSE,
                category=category,
                date=start_date + timedelta(days=i * 5),
                status="completed"
            )
            db.add(transaction)
    
    db.commit()
    
    # Get category breakdown
    breakdown = insight_service.get_category_breakdown(
        start_date, end_date, "expense", limit=10
    )
    
    assert len(breakdown) == 3
    
    # Check totals and percentages
    total_expenses = sum(categories.values())
    
    for item in breakdown:
        expected_amount = categories[item.category]
        expected_percentage = (expected_amount / total_expenses) * 100
        
        assert item.amount == expected_amount
        assert abs(item.percentage - expected_percentage) < 0.01

def test_trend_insights(db: Session, test_user: User):
    """Test trend insights calculation"""
    insight_service = InsightService(db, test_user.id)
    
    # Create monthly transactions
    now = datetime.now()
    
    for month_offset in range(6):
        month_date = datetime(now.year, now.month, 1) - timedelta(days=month_offset * 30)
        
        # Add income
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Salary Month {month_offset}",
            amount=2000.00,
            transaction_type=TransactionType.INCOME,
            category="Salary",
            date=month_date,
            status="completed"
        )
        db.add(transaction)
        
        # Add expenses
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Expenses Month {month_offset}",
            amount=-1500.00,
            transaction_type=TransactionType.EXPENSE,
            category="Various",
            date=month_date,
            status="completed"
        )
        db.add(transaction)
    
    db.commit()
    
    # Get trend insights
    trends = insight_service.get_trend_insights("expenses", "monthly", 6)
    
    assert len(trends) == 6
    assert all(trend.value == 1500.00 for trend in trends)

def test_monthly_summary(db: Session, test_user: User):
    """Test monthly summary calculation"""
    insight_service = InsightService(db, test_user.id)
    
    now = datetime.now()
    year = now.year
    
    # Create transactions for each month
    for month in range(1, 4):  # First 3 months
        month_date = datetime(year, month, 15)
        
        # Income
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Salary {month}/2024",
            amount=3000.00,
            transaction_type=TransactionType.INCOME,
            category="Salary",
            date=month_date,
            status="completed"
        )
        db.add(transaction)
        
        # Expenses
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Expenses {month}/2024",
            amount=-2000.00,
            transaction_type=TransactionType.EXPENSE,
            category="Various",
            date=month_date,
            status="completed"
        )
        db.add(transaction)
    
    db.commit()
    
    # Get monthly summary
    summary = insight_service.get_monthly_summary(year, 3)
    
    assert len(summary) == 3
    
    for month_summary in summary:
        assert month_summary.total_income == 3000.00
        assert month_summary.total_expenses == 2000.00
        assert month_summary.net_cash_flow == 1000.00
        assert month_summary.savings_rate == (1000.00 / 3000.00) * 100

def test_anomaly_detection(db: Session, test_user: User):
    """Test anomaly detection"""
    insight_service = InsightService(db, test_user.id)
    
    # Create normal transactions
    for i in range(20):
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Normal expense {i}",
            amount=-50.00,
            transaction_type=TransactionType.EXPENSE,
            category="Food",
            date=datetime.now() - timedelta(days=i),
            status="completed"
        )
        db.add(transaction)
    
    # Create an anomaly (very large transaction)
    transaction = Transaction(
        user_id=test_user.id,
        description="Luxury purchase",
        amount=-2000.00,
        transaction_type=TransactionType.EXPENSE,
        category="Food",  # Same category but much larger amount
        date=datetime.now(),
        status="completed"
    )
    db.add(transaction)
    
    db.commit()
    
    # Detect anomalies
    anomalies = insight_service.detect_anomalies(threshold=2.0)
    
    assert len(anomalies) > 0
    assert any("Luxury purchase" in anomaly["description"] for anomaly in anomalies)
    
    # Check anomaly properties
    for anomaly in anomalies:
        if "Luxury purchase" in anomaly["description"]:
            assert anomaly["deviation_score"] > 2.0
            assert anomaly["amount"] == 2000.00
            assert "high" in anomaly["reason"].lower() or "large" in anomaly["reason"].lower()

def test_spending_habits_analysis(db: Session, test_user: User):
    """Test spending habits analysis"""
    insight_service = InsightService(db, test_user.id)
    
    start_date = datetime.now() - timedelta(days=90)
    end_date = datetime.now()
    
    # Create transactions with patterns
    # More spending on weekends
    weekday_spending = {
        0: 100.00,  # Monday
        1: 100.00,  # Tuesday
        2: 100.00,  # Wednesday
        3: 100.00,  # Thursday
        4: 100.00,  # Friday
        5: 300.00,  # Saturday
        6: 300.00   # Sunday
    }
    
    for day_offset in range(90):
        transaction_date = start_date + timedelta(days=day_offset)
        weekday = transaction_date.weekday()
        
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Spending day {day_offset}",
            amount=-weekday_spending[weekday],
            transaction_type=TransactionType.EXPENSE,
            category="Various",
            date=transaction_date,
            status="completed"
        )
        db.add(transaction)
    
    db.commit()
    
    # Analyze spending habits
    habits = insight_service.analyze_spending_habits(start_date, end_date)
    
    assert "weekday_spending" in habits
    assert "time_of_day" in habits
    assert "merchant_patterns" in habits
    assert "category_patterns" in habits
    
    # Check weekday pattern
    weekday_data = habits["weekday_spending"]
    assert weekday_data["Saturday"] > weekday_data["Monday"] * 2  # Should show weekend spending pattern
    
    # Check insights and recommendations
    assert len(habits["insights"]) > 0
    assert len(habits["recommendations"]) > 0
    assert 0 <= habits["strength_score"] <= 1

def test_api_cash_flow_insights(client: TestClient, test_user_headers: dict):
    """Test API endpoint for cash flow insights"""
    response = client.get("/api/v1/insights/cash-flow", headers=test_user_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    assert "total_income" in data
    assert "total_expenses" in data
    assert "net_cash_flow" in data
    assert "cash_flow_trend" in data

def test_api_category_breakdown(client: TestClient, test_user_headers: dict):
    """Test API endpoint for category breakdown"""
    response = client.get(
        "/api/v1/insights/category-breakdown",
        params={"insight_type": "expense", "time_range": "30d"},
        headers=test_user_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)
    if len(data) > 0:
        assert "category" in data[0]
        assert "amount" in data[0]
        assert "percentage" in data[0]

def test_api_trend_insights(client: TestClient, test_user_headers: dict):
    """Test API endpoint for trend insights"""
    response = client.get(
        "/api/v1/insights/trends",
        params={"metric": "expenses", "period": "monthly", "months": 6},
        headers=test_user_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)
    if len(data) > 0:
        assert "period" in data[0]
        assert "value" in data[0]
        assert "period_start" in data[0]
        assert "period_end" in data[0]

def test_api_monthly_summary(client: TestClient, test_user_headers: dict):
    """Test API endpoint for monthly summary"""
    current_year = datetime.now().year
    
    response = client.get(
        "/api/v1/insights/monthly-summary",
        params={"year": current_year, "months": 12},
        headers=test_user_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)
    if len(data) > 0:
        assert "year" in data[0]
        assert "month" in data[0]
        assert "total_income" in data[0]
        assert "total_expenses" in data[0]

def test_api_anomalies(client: TestClient, test_user_headers: dict):
    """Test API endpoint for anomaly detection"""
    response = client.get(
        "/api/v1/insights/anomalies",
        params={"threshold": 2.0},
        headers=test_user_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "anomalies" in data
    assert "total_detected" in data
    assert "threshold_used" in data
    assert isinstance(data["anomalies"], list)

def test_api_predictions(client: TestClient, test_user_headers: dict):
    """Test API endpoint for cash flow predictions"""
    response = client.get(
        "/api/v1/insights/predictions",
        params={"horizon": 30},
        headers=test_user_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "predictions" in data
    assert "horizon_days" in data
    assert "generated_at" in data
    assert isinstance(data["predictions"], list)

def test_api_spending_habits(client: TestClient, test_user_headers: dict):
    """Test API endpoint for spending habits"""
    response = client.get(
        "/api/v1/insights/spending-habits",
        params={"time_range": "90d"},
        headers=test_user_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "habits" in data
    assert "insights" in data
    assert "recommendations" in data
    assert "strength_score" in data
    
    habits = data["habits"]
    assert "weekday_spending" in habits
    assert "time_of_day" in habits

def test_insight_service_edge_cases(db: Session, test_user: User):
    """Test edge cases for insight service"""
    insight_service = InsightService(db, test_user.id)
    
    # Test with no transactions
    start_date = datetime.now() - timedelta(days=30)
    end_date = datetime.now()
    
    insights = insight_service.get_cash_flow_insights(start_date, end_date)
    
    assert insights.total_income == 0
    assert insights.total_expenses == 0
    assert insights.net_cash_flow == 0
    assert insights.income_transaction_count == 0
    assert insights.expense_transaction_count == 0
    
    # Test category breakdown with no transactions
    breakdown = insight_service.get_category_breakdown(start_date, end_date, "expense")
    assert len(breakdown) == 0
    
    # Test monthly summary with no transactions
    summary = insight_service.get_monthly_summary(datetime.now().year, 3)
    assert len(summary) == 3  # Should still return months
    for month_summary in summary:
        assert month_summary.total_income == 0
        assert month_summary.total_expenses == 0

def test_predictions_with_insufficient_data(db: Session, test_user: User):
    """Test predictions with insufficient historical data"""
    insight_service = InsightService(db, test_user.id)
    
    # Create only a few transactions
    for i in range(3):
        transaction = Transaction(
            user_id=test_user.id,
            description=f"Transaction {i}",
            amount=-100.00,
            transaction_type=TransactionType.EXPENSE,
            category="Test",
            date=datetime.now() - timedelta(days=i * 2),
            status="completed"
        )
        db.add(transaction)
    
    db.commit()
    
    # Get predictions
    predictions = insight_service.predict_cash_flow(horizon_days=7)
    
    # Should handle insufficient data gracefully
    assert isinstance(predictions, list)

@pytest.fixture
def test_user(db: Session):
    """Create a test user"""
    from app.models.user import User
    
    user = User(
        email="test_insights@example.com",
        hashed_password="hashed_password",
        is_active=True,
        full_name="Test User"
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@pytest.fixture(autouse=True)
def cleanup_test_data(db: Session, test_user: User):
    """Clean up test data after each test"""
    yield
    
    # Delete test transactions
    db.query(Transaction).filter(Transaction.user_id == test_user.id).delete()
    db.commit()
    
    # Delete test user
    db.query(User).filter(User.id == test_user.id).delete()
    db.commit()