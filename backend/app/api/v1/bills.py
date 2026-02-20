from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.models.bill import Bill
from app.models.user import User
from app.schemas.bill import (
    BillCreate, 
    BillUpdate, 
    BillResponse, 
    BillSummary,
    CurrencyCode
)
from app.crud.bill import bill_crud
from app.services.currency_service import convert_currency
from app.core.security import get_current_user
from app.crud.reward import reward_crud
from app.services.reward_service import reward_service
from app.models.reward import Reward



router = APIRouter()

@router.post("/", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
def create_bill(
    bill: BillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new bill"""
    try:
        # Check if currency conversion is needed
        if bill.currency != CurrencyCode.USD:
            usd_amount = convert_currency(bill.amount, bill.currency, CurrencyCode.USD)
            bill_data = bill.dict()
            bill_data["amount_usd"] = usd_amount
            db_bill = bill_crud.create(db=db, obj_in=bill_data, user_id=current_user.id)
        else:
            bill_data = bill.dict()
            bill_data["amount_usd"] = bill.amount
            db_bill = bill_crud.create(db=db, obj_in=bill_data, user_id=current_user.id)
        
        return db_bill
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create bill: {str(e)}"
        )

@router.get("/", response_model=List[BillResponse])
def read_bills(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    is_paid: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all bills for current user"""
    filters = {"user_id": current_user.id}
    if category:
        filters["category"] = category
    if is_paid is not None:
        filters["is_paid"] = is_paid
    
    bills = bill_crud.get_multi(
        db=db, 
        skip=skip, 
        limit=limit,
        filters=filters
    )
    return bills

@router.get("/{bill_id}", response_model=BillResponse)
def read_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific bill by ID"""
    bill = bill_crud.get(db=db, id=bill_id)
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    if bill.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return bill

@router.put("/{bill_id}", response_model=BillResponse)
def update_bill(
    bill_id: int,
    bill_update: BillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a bill"""
    bill = bill_crud.get(db=db, id=bill_id)
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    if bill.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # If amount or currency changed, update USD amount
    update_data = bill_update.dict(exclude_unset=True)
    if "amount" in update_data or "currency" in update_data:
        amount = update_data.get("amount", bill.amount)
        currency = update_data.get("currency", bill.currency)
        if currency != CurrencyCode.USD:
            update_data["amount_usd"] = convert_currency(amount, currency, CurrencyCode.USD)
        else:
            update_data["amount_usd"] = amount
    
    updated_bill = bill_crud.update(db=db, db_obj=bill, obj_in=update_data)
    return updated_bill

@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a bill"""
    bill = bill_crud.get(db=db, id=bill_id)
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    if bill.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    bill_crud.remove(db=db, id=bill_id)
    return None

@router.get("/summary/due-soon", response_model=List[BillResponse])
def get_due_soon_bills(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get bills due within the next X days"""
    today = date.today()
    end_date = today + timedelta(days=days)
    
    bills = bill_crud.get_due_soon(
        db=db, 
        user_id=current_user.id,
        start_date=today,
        end_date=end_date
    )
    return bills

@router.get("/summary/monthly", response_model=BillSummary)
def get_monthly_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get monthly bill summary"""
    if month is None:
        month = datetime.now().month
    if year is None:
        year = datetime.now().year
    
    summary = bill_crud.get_monthly_summary(
        db=db,
        user_id=current_user.id,
        month=month,
        year=year
    )
    
    return BillSummary(
        total_bills=summary["total_bills"],
        total_amount=summary["total_amount"],
        paid_bills=summary["paid_bills"],
        unpaid_bills=summary["unpaid_bills"],
        category_breakdown=summary["category_breakdown"]
    )

@router.post("/{bill_id}/pay", response_model=BillResponse)
def mark_bill_as_paid(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bill = bill_crud.get(db=db, id=bill_id)

    if not bill or bill.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Bill not found")

    # Prevent double payment
    if bill.is_paid:
        return bill

    # 1️⃣ Mark bill as paid
    updated_bill = bill_crud.mark_as_paid(db=db, db_obj=bill)

    # 2️⃣ Prevent duplicate rewards
    existing_reward = db.query(Reward).filter(
        Reward.bill_id == bill.id
    ).first()

    if not existing_reward:
        # 3️⃣ Calculate points
        points = reward_service.calculate_points(
            bill_amount=bill.amount_usd,
            on_time_payment=not bill.is_overdue,
            category=bill.category
        )

        # 4️⃣ Create reward
        reward_crud.create(
            db=db,
            obj_in={
                "user_id": current_user.id,
                "bill_id": bill.id,
                "bill_amount": bill.amount_usd,
                "points": points,
                "category": bill.category,
                "on_time_payment": not bill.is_overdue,
                "description": f"Reward for paying bill: {bill.name}"
            }
        )

    return updated_bill
