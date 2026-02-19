from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from typing import Optional, Dict
from datetime import date

from ..models.transaction import Transaction


class CategorizationService:
    def __init__(self, db: Session):
        self.db = db

    def get_category_statistics(
        self,
        user_id: int,
        month: Optional[int] = None,
        year: Optional[int] = None
    ) -> Dict:
        query = self.db.query(
            Transaction.category,
            func.sum(Transaction.amount).label("total_amount"),
            func.count(Transaction.id).label("transaction_count"),
        ).filter(
            Transaction.user_id == user_id,
            Transaction.category.isnot(None),
            Transaction.category != "Uncategorized",
        )

        if year:
            query = query.filter(extract("year", Transaction.date) == year)
        if month:
            query = query.filter(extract("month", Transaction.date) == month)

        results = query.group_by(Transaction.category).all()
        total_spent = sum(float(r.total_amount) for r in results)

        return {
            "total_spent": total_spent,
            "statistics": [
                {
                    "category": r.category,
                    "total_amount": float(r.total_amount),
                    "transaction_count": r.transaction_count,
                }
                for r in results
            ],
        }
