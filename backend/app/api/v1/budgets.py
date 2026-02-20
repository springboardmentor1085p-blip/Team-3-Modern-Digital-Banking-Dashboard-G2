from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.core.database import get_db
from ...models.budget import Budget
from ...models.category import Category
from ...models.transaction import Transaction
from ...schemas.budget import (
    BudgetCreate, 
    BudgetUpdate, 
    BudgetResponse,
    CategoryCreate,
    CategoryResponse,
    BudgetSummary
)
from ...crud.budget import (
    create_budget,
    get_budget,
    get_budgets,
    update_budget,
    delete_budget,
    create_budget_category,
    get_budget_categories,
    delete_budget_category
)

from ...services.budget_service import BudgetService
from app.api.deps import get_current_active_user as get_current_user
from ...models.user import User

router = APIRouter(
    tags=["budgets"]
)

# =========================
# BUDGET CRUD ROUTES
# =========================

@router.post("/", response_model=BudgetResponse)
def create_new_budget(
    budget: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new budget"""
    return create_budget(db=db, obj_in=budget, user_id=current_user.id)


@router.get("/", response_model=List[BudgetResponse])
def list_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020),
    is_active: Optional[bool] = None
):
    """Get all budgets for current user"""
    return get_budgets(
        db=db, 
        user_id=current_user.id, 
        month=month, 
        year=year,
        is_active=is_active
    )

# =========================
# CATEGORY ROUTES (MOVED UP)
# =========================

@router.post("/categories", response_model=CategoryResponse)
def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a budget category"""
    return create_budget_category(db=db, obj_in=category)


@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all budget categories for user"""
    return get_budget_categories(db=db)


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a budget category"""
    success = delete_budget_category(
        db=db, 
        category_id=category_id, 
        user_id=current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# =========================
# SUMMARY ROUTE
# =========================

@router.get("/summary", response_model=BudgetSummary)
def get_budget_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020)
):
    """Get budget summary with spending analysis"""
    if not month:
        month = datetime.now().month
    if not year:
        year = datetime.now().year
    
    budget_service = BudgetService(db)
    return budget_service.get_budget_summary(
        user_id=current_user.id,
        month=month,
        year=year
    )

# =========================
# BUDGET ID ROUTES (MOVED DOWN)
# =========================

@router.get("/{budget_id}", response_model=BudgetResponse)
def read_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific budget"""
    budget = get_budget(db=db, budget_id=budget_id, user_id=current_user.id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget_endpoint(
    budget_id: int,
    budget_update: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a budget"""
    budget = update_budget(
    db=db,
    budget_id=budget_id,
    obj_in=budget_update,
    user_id=current_user.id
    )

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


@router.delete("/{budget_id}")
def delete_budget_endpoint(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a budget"""
    success = delete_budget(
        db=db, 
        budget_id=budget_id, 
        user_id=current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted successfully"}


@router.get("/{budget_id}/progress")
def get_budget_progress(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get budget progress with spending details"""
    budget = get_budget(db=db, budget_id=budget_id, user_id=current_user.id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    budget_service = BudgetService(db)
    progress = budget_service.calculate_budget_progress(budget_id=budget_id)
    
    return {
        "budget": budget,
        "progress": progress
    }
