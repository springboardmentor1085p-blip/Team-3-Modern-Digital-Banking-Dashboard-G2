import pytest
from datetime import datetime, date
from decimal import Decimal
from unittest.mock import Mock, patch

from ..models.budget import Budget, BudgetPeriod
from ..schemas.budget import BudgetCreate, BudgetUpdate
from ..crud.budget import (
    create_budget,
    get_budget,
    get_user_budgets,
    update_budget,
    delete_budget
)
from ..services.budget_service import BudgetService


class TestBudgetCRUD:
    def test_create_budget(self, db_session, test_user):
        """Test creating a new budget"""
        budget_data = BudgetCreate(
            name="Groceries",
            category="Food",
            subcategory="Groceries",
            amount=Decimal("500.00"),
            period=BudgetPeriod.MONTHLY,
            month=11,
            year=2024,
            is_active=True
        )
        
        budget = create_budget(db_session, budget_data, test_user.id)
        
        assert budget.id is not None
        assert budget.user_id == test_user.id
        assert budget.name == "Groceries"
        assert budget.category == "Food"
        assert budget.amount == Decimal("500.00")
        assert budget.period == BudgetPeriod.MONTHLY
    
    def test_get_budget(self, db_session, test_user, test_budget):
        """Test retrieving a budget"""
        budget = get_budget(db_session, test_budget.id, test_user.id)
        
        assert budget is not None
        assert budget.id == test_budget.id
        assert budget.user_id == test_user.id
    
    def test_get_user_budgets(self, db_session, test_user, test_budgets):
        """Test retrieving all budgets for a user"""
        budgets = get_user_budgets(db_session, test_user.id)
        
        assert len(budgets) == len(test_budgets)
        assert all(b.user_id == test_user.id for b in budgets)
    
    def test_get_user_budgets_with_filters(self, db_session, test_user, test_budgets):
        """Test filtering budgets by month and year"""
        # Filter by month
        budgets = get_user_budgets(
            db_session, 
            test_user.id, 
            month=11,
            year=2024
        )
        
        assert all(b.month == 11 for b in budgets if b.month is not None)
        assert all(b.year == 2024 for b in budgets)
    
    def test_update_budget(self, db_session, test_user, test_budget):
        """Test updating a budget"""
        update_data = BudgetUpdate(
            name="Updated Groceries",
            amount=Decimal("600.00")
        )
        
        updated_budget = update_budget(
            db_session, 
            test_budget.id, 
            update_data, 
            test_user.id
        )
        
        assert updated_budget.name == "Updated Groceries"
        assert updated_budget.amount == Decimal("600.00")
        assert updated_budget.updated_at is not None
    
    def test_delete_budget(self, db_session, test_user, test_budget):
        """Test deleting a budget"""
        success = delete_budget(db_session, test_budget.id, test_user.id)
        
        assert success is True
        
        # Verify budget is deleted
        deleted_budget = get_budget(db_session, test_budget.id, test_user.id)
        assert deleted_budget is None


class TestBudgetService:
    def test_calculate_budget_progress(self, db_session, test_user, test_budget, test_transactions):
        """Test calculating budget progress"""
        service = BudgetService(db_session)
        
        progress = service.calculate_budget_progress(test_budget.id)
        
        assert progress.budget_id == test_budget.id
        assert progress.budget_name == test_budget.name
        assert progress.category == test_budget.category
        assert isinstance(progress.spent_amount, Decimal)
        assert isinstance(progress.remaining_amount, Decimal)
        assert 0 <= progress.percentage_used <= 100
        assert progress.status in ["under", "warning", "near_limit", "over"]
    
    def test_get_budget_summary(self, db_session, test_user, test_budgets, test_transactions):
        """Test getting budget summary"""
        service = BudgetService(db_session)
        
        summary = service.get_budget_summary(
            user_id=test_user.id,
            month=11,
            year=2024
        )
        
        assert summary.total_budget > 0
        assert summary.total_spent >= 0
        assert summary.total_remaining == summary.total_budget - summary.total_spent
        assert 0 <= summary.overall_percentage <= 100
        assert len(summary.category_breakdown) > 0
    
    def test_get_spending_trends(self, db_session, test_user, test_budget, test_transactions):
        """Test getting spending trends"""
        service = BudgetService(db_session)
        
        trends = service.get_spending_trends(
            user_id=test_user.id,
            category="Food",
            months=3
        )
        
        assert len(trends) <= 3
        for trend in trends:
            assert "month" in trend
            assert "year" in trend
            assert "spent" in trend
            assert "budget" in trend
    
    def test_predict_future_spending(self, db_session, test_user, test_budget, test_transactions):
        """Test predicting future spending"""
        service = BudgetService(db_session)
        
        prediction = service.predict_future_spending(
            user_id=test_user.id,
            category="Food"
        )
        
        assert "prediction" in prediction
        assert "confidence" in prediction
        assert "range" in prediction
        assert "based_on_months" in prediction
        
        if prediction["prediction"] is not None:
            assert 0 <= prediction["confidence"] <= 100
            assert "low" in prediction["range"]
            assert "high" in prediction["range"]


class TestBudgetValidations:
    def test_month_required_for_monthly_budgets(self):
        """Test that month is required for monthly budgets"""
        with pytest.raises(ValueError):
            BudgetCreate(
                name="Test Budget",
                category="Test",
                amount=Decimal("100.00"),
                period=BudgetPeriod.MONTHLY,
                month=None,  # Should raise error
                year=2024
            )
    
    def test_month_not_allowed_for_non_monthly_budgets(self):
        """Test that month should not be specified for non-monthly budgets"""
        with pytest.raises(ValueError):
            BudgetCreate(
                name="Test Budget",
                category="Test",
                amount=Decimal("100.00"),
                period=BudgetPeriod.YEARLY,
                month=11,  # Should raise error
                year=2024
            )
    
    def test_amount_must_be_positive(self):
        """Test that budget amount must be positive"""
        with pytest.raises(ValueError):
            BudgetCreate(
                name="Test Budget",
                category="Test",
                amount=Decimal("0.00"),  # Should raise error
                period=BudgetPeriod.MONTHLY,
                month=11,
                year=2024
            )