from typing import Dict, List, Optional, Tuple
from datetime import datetime, date
from decimal import Decimal
from unittest import result
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, extract, func
from sqlalchemy.orm import joinedload

from ..models.budget import Budget
from ..models.category import Category
from ..models.transaction import Transaction
from ..schemas.budget import BudgetSummary, BudgetProgress
from ..models.account import Account



class BudgetService:
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_budget_progress(self, budget_id: int) -> BudgetProgress:
        budget = (
            self.db.query(Budget)
            .options(joinedload(Budget.category))
            .filter(Budget.id == budget_id)
            .first()
        )

        if not budget:
            raise ValueError(f"Budget {budget_id} not found")

        query = (
            self.db.query(
                func.sum(Transaction.amount).label("total_spent"),
                func.count(Transaction.id).label("transaction_count")
            )
            .join(Account, Transaction.account_id == Account.id)
            .filter(Account.user_id == budget.user_id)
        )

        if budget.category:
            query = query.filter(Transaction.category == budget.category.name)
            category_name = budget.category.name
        else:
            query = query.filter(
                or_(
                    Transaction.category == None,
                    Transaction.category == "",
                    Transaction.category == "Uncategorized"
                )
            )
            category_name = "Uncategorized"

        if budget.period == "monthly" and budget.month:
            query = query.filter(
                extract("year", Transaction.transaction_date) == budget.year,
                extract("month", Transaction.transaction_date) == budget.month
            )
        elif budget.period == "yearly":
            query = query.filter(
                extract("year", Transaction.transaction_date) == budget.year
            )

        result = query.first()

        spent = result.total_spent or Decimal("0")
        budget_amount = budget.amount or Decimal("0")
        remaining = max(budget_amount - spent, Decimal("0"))
        percentage = float((spent / budget_amount) * 100) if budget_amount > 0 else 0.0

        if percentage >= 100:
            status = "over"
        elif percentage >= 90:
            status = "warning"
        elif percentage >= 75:
            status = "near_limit"
        else:
            status = "under"

        return BudgetProgress(
            budget_id=budget.id,
            budget_name=budget.name,
            category=category_name,
            budget_amount=budget_amount,
            spent_amount=spent,
            remaining_amount=remaining,
            percentage_used=percentage,
            status=status,
            transactions_count=result.transaction_count or 0
        )

    
    def get_budget_summary(
        self, 
        user_id: int, 
        month: int, 
        year: int
    ) -> BudgetSummary:
        """Get comprehensive budget summary for a month"""
        # Get all active monthly budgets for the specified month/year
        budgets = (
            self.db.query(Budget)
            .options(joinedload(Budget.category))
            .filter(
                Budget.user_id == user_id,
                Budget.is_active == True,
                Budget.year == year,
                Budget.month == month,
                Budget.period == 'monthly'
            )
            .all()
        )
        
        total_budget = Decimal('0')
        total_spent = Decimal('0')
        category_breakdown = []
        over_budget_categories = []
        near_limit_categories = []
        
        for budget in budgets:
            progress = self.calculate_budget_progress(budget.id)
            
            total_budget += budget.amount or Decimal("0")
            total_spent += progress.spent_amount
            
            budget_amount = budget.amount or Decimal("0")
            spent_amount = progress.spent_amount or Decimal("0")

            remaining_amount = budget_amount - spent_amount if budget_amount > 0 else Decimal("0")
            percentage = float((spent_amount / budget_amount) * 100) if budget_amount > 0 else 0.0

            category_data = {
                "category": budget.category.name if budget.category else "Uncategorized",
                "budget": float(budget_amount),
                "spent": float(spent_amount),
                "remaining": float(remaining_amount),
                "percentage": percentage,
                "status": progress.status
            }
            existing = next(
                (c for c in category_breakdown if c["category"] == category_data["category"]),
                None
            )

            if existing:
                existing["budget"] += category_data["budget"]
                existing["spent"] += category_data["spent"]
                existing["remaining"] += category_data["remaining"]
                existing["percentage"] = (
                    (existing["spent"] / existing["budget"]) * 100
                    if existing["budget"] > 0 else 0
                )
            else:
                category_breakdown.append(category_data)


            
            category_name = category_data["category"]

            if progress.status == "over" and category_name not in over_budget_categories:
                over_budget_categories.append(category_name)

            elif progress.status in ("warning", "near_limit") and category_name not in near_limit_categories:
                near_limit_categories.append(category_name)

        
        total_remaining = total_budget - total_spent
        
        if total_budget > 0:
            overall_percentage = (total_spent / total_budget) * 100
        else:
            overall_percentage = 0
        
        return BudgetSummary(
            total_budget=total_budget,
            total_spent=total_spent,
            total_remaining=total_remaining,
            overall_percentage=float(overall_percentage),
            month=month,
            year=year,
            category_breakdown=category_breakdown,
            over_budget_categories=over_budget_categories,
            near_limit_categories=near_limit_categories
        )
    
    def get_spending_trends(
        self, 
        user_id: int, 
        category_id: int,
        months: int = 6
    ) -> List[Dict]:
        """Get spending trends for a category over time"""
        end_date = datetime.now()
        start_date = datetime(end_date.year, end_date.month - months + 1, 1)
        
        trends = []
        
        for i in range(months):
            current_date = datetime(start_date.year, start_date.month + i, 1)
            
            # Get budget for this month
            budget = self.db.query(Budget).filter(
                and_(
                    Budget.user_id == user_id,
                    Budget.category == category_id,
                    Budget.year == current_date.year,
                    Budget.month == current_date.month,
                    Budget.period == 'monthly'
                )
            ).first()
            
            # Get spending for this month
            spending_result = (
                self.db.query(func.sum(Transaction.amount).label('total_spent'))
                .join(Account, Transaction.account_id == Account.id)
                .filter(
                    Account.user_id == user_id,
                    Transaction.category == category_id,
                    extract('year', Transaction.transaction_date) == current_date.year,
                    extract('month', Transaction.transaction_date) == current_date.month
                )
                .first()
            )

            
            spent = spending_result.total_spent or Decimal('0')
            budget_amount = budget.amount if budget else Decimal('0')
            
            trends.append({
                "month": current_date.month,
                "year": current_date.year,
                "spent": float(spent),
                "budget": float(budget_amount),
                "variance": float(budget_amount - spent) if budget_amount > 0 else None
            })
        
        return trends
    
    def predict_future_spending(
        self, 
        user_id: int, 
        category: str
    ) -> Dict:
        """Predict future spending based on historical data"""
        # Get last 6 months of spending
        trends = self.get_spending_trends(user_id, category, 6)
        
        if not trends:
            return {"prediction": None, "confidence": 0}
        
        # Simple average prediction
        total_spent = sum(t['spent'] for t in trends)
        avg_spent = total_spent / len(trends)
        
        # Calculate confidence based on variance
        variances = [abs(t['spent'] - avg_spent) for t in trends]
        avg_variance = sum(variances) / len(variances) if variances else 0
        
        if avg_spent > 0:
            confidence = max(0, 100 - (avg_variance / avg_spent * 100))
        else:
            confidence = 0
        
        return {
            "prediction": avg_spent,
            "confidence": min(95, confidence),  # Cap at 95%
            "range": {
                "low": avg_spent - avg_variance,
                "high": avg_spent + avg_variance
            },
            "based_on_months": len(trends)
        }