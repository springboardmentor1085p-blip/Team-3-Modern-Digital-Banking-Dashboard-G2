from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.models.user import User
from app.schemas.reward import (
    RewardCreate, 
    RewardResponse, 
    RewardSummary,
    RewardTier
)
from app.crud.reward import reward_crud
from app.services.reward_service import RewardService
from app.api.deps import get_current_active_user

router = APIRouter()
reward_service = RewardService()

@router.post("/", response_model=RewardResponse, status_code=status.HTTP_201_CREATED)
def create_reward(
    reward: RewardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new reward entry"""
    try:
        # Calculate points based on bill payment
        points = reward_service.calculate_points(
            bill_amount=reward.bill_amount,
            on_time_payment=reward.on_time_payment,
            category=reward.category
        )
        
        # Create reward record
        reward_data = reward.dict()
        reward_data["points"] = points
        reward_data["user_id"] = current_user.id
        
        db_reward = reward_crud.create(db=db, obj_in=reward_data)
        return db_reward
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create reward: {str(e)}"
        )

@router.get("/", response_model=List[RewardResponse])
def read_rewards(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve all rewards for current user"""
    filters = {"user_id": current_user.id}
    
    if start_date and end_date:
        filters["date_range"] = (start_date, end_date)
    
    rewards = reward_crud.get_multi(
        db=db, 
        skip=skip, 
        limit=limit,
        filters=filters
    )
    return rewards

@router.get("/summary", response_model=RewardSummary)
def get_reward_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get reward summary for current user"""
    # Get total points
    total_points = reward_crud.get_total_points(db=db, user_id=current_user.id)
    
    # Get current tier
    current_tier = reward_service.get_current_tier(total_points)
    
    # Get points needed for next tier
    next_tier = reward_service.get_next_tier(total_points)
    points_to_next = reward_service.get_points_to_next_tier(total_points)
    
    # Get recent rewards
    recent_rewards = [
        RewardResponse.model_validate(r)
            for r in reward_crud.get_recent_rewards(
                db=db,
                user_id=current_user.id,
                limit=5
            )
    ]

    # Get monthly breakdown
    monthly_breakdown = reward_crud.get_monthly_breakdown(
        db=db, 
        user_id=current_user.id
    )
    
    return RewardSummary(
        total_points=total_points,
        current_tier=current_tier,
        next_tier=next_tier,
        points_to_next_tier=points_to_next,
        recent_rewards=recent_rewards,
        monthly_breakdown=monthly_breakdown
    )

@router.get("/leaderboard", response_model=List[dict])
def get_leaderboard(
    period: str = Query("monthly", regex="^(daily|weekly|monthly|yearly)$"),
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get reward points leaderboard"""
    leaderboard = reward_crud.get_leaderboard(
        db=db,
        period=period,
        limit=limit
    )
    return leaderboard

@router.post("/process-bill-payment/{bill_id}")
def process_bill_payment_reward(
    bill_id: int,
    on_time_payment: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Process reward points for a bill payment"""
    try:
        from app.crud.bill import bill_crud
        
        # Get the bill
        bill = bill_crud.get(db=db, id=bill_id)
        if not bill or bill.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bill not found"
            )
        
        # Calculate and create reward
        points = reward_service.calculate_points(
            bill_amount=bill.amount_usd,
            on_time_payment=on_time_payment,
            category=bill.category
        )
        
        # Create reward record
        reward_data = {
            "user_id": current_user.id,
            "bill_id": bill_id,
            "bill_amount": bill.amount_usd,
            "points": points,
            "on_time_payment": on_time_payment,
            "category": bill.category,
            "description": f"Reward for bill payment: {bill.name}"
        }
        
        db_reward = reward_crud.create(db=db, obj_in=reward_data)
        
        # Update user's total points
        from app.crud.user import user_crud
        user_crud.update_points(db=db, user_id=current_user.id, points_to_add=points)
        
        return {
            "message": "Reward points awarded",
            "points": points,
            "reward_id": db_reward.id,
            "total_points": current_user.points + points
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process reward: {str(e)}"
        )

@router.get("/tiers", response_model=List[dict])
def get_reward_tiers():
    """Get all reward tiers and their requirements"""
    return reward_service.get_all_tiers()

@router.get("/history/{user_id}", response_model=List[RewardResponse])
def get_user_reward_history(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get reward history for a specific user (admin only)"""
    # Check if current user is admin
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    rewards = reward_crud.get_multi(
        db=db,
        skip=skip,
        limit=limit,
        filters={"user_id": user_id}
    )
    return rewards