from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import re

from app.core.database import get_db
from ...services.categorization import CategorizationService
from app.core.security import get_current_user
from ...models.user import User
from ...models.transaction import Transaction
from ...schemas.categorization import (
    CategoryRuleCreate,
    CategoryRuleResponse,
    AutoCategorizeRequest,
    AutoCategorizeResponse,
    TransactionCategoryUpdate
)

router = APIRouter()

@router.post("/rules", response_model=CategoryRuleResponse)
def create_category_rule(
    rule: CategoryRuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new categorization rule"""
    service = CategorizationService(db)
    return service.create_rule(user_id=current_user.id, rule=rule)

@router.get("/rules", response_model=List[CategoryRuleResponse])
def list_category_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all categorization rules for user"""
    service = CategorizationService(db)
    return service.get_user_rules(user_id=current_user.id)

@router.post("/auto-categorize", response_model=AutoCategorizeResponse)
def auto_categorize_transactions(
    request: AutoCategorizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Auto-categorize transactions based on rules"""
    service = CategorizationService(db)
    
    if request.transaction_ids:
        # Categorize specific transactions
        results = service.categorize_transactions(
            user_id=current_user.id,
            transaction_ids=request.transaction_ids
        )
    else:
        # Categorize all uncategorized transactions
        results = service.auto_categorize_all(
            user_id=current_user.id,
            start_date=request.start_date,
            end_date=request.end_date
        )
    
    return AutoCategorizeResponse(
        categorized_count=results["categorized_count"],
        uncategorized_count=results["uncategorized_count"],
        details=results["details"]
    )

@router.put("/transactions/{transaction_id}/category")
def update_transaction_category(
    transaction_id: int,
    category_update: TransactionCategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update transaction category manually"""
    # Verify transaction belongs to user
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update category
    transaction.category = category_update.category
    transaction.subcategory = category_update.subcategory
    
    db.commit()
    db.refresh(transaction)
    
    return {
        "message": "Transaction category updated",
        "transaction": {
            "id": transaction.id,
            "description": transaction.description,
            "category": transaction.category,
            "subcategory": transaction.subcategory
        }
    }

@router.get("/suggestions")
def get_category_suggestions(
    description: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get category suggestions based on transaction description"""
    service = CategorizationService(db)
    
    suggestions = service.get_category_suggestions(
        user_id=current_user.id,
        description=description
    )
    
    return {
        "description": description,
        "suggestions": suggestions,
        "recommended": suggestions[0] if suggestions else None
    }

@router.get("/stats")
def get_category_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020)
):
    """Get spending statistics by category"""
    service = CategorizationService(db)
    
    stats = service.get_category_statistics(
        user_id=current_user.id,
        month=month,
        year=year
    )
    
    return stats

@router.delete("/rules/{rule_id}")
def delete_category_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a categorization rule"""
    service = CategorizationService(db)
    
    success = service.delete_rule(
        user_id=current_user.id,
        rule_id=rule_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return {"message": "Rule deleted successfully"}