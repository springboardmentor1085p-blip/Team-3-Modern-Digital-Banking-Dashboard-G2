from pydantic import BaseModel, Field, validator, condecimal, ConfigDict
from typing import Any, Optional, List, Dict, Annotated
from datetime import datetime, date
from decimal import Decimal
import enum
from typing import Optional
from app.models.reward import RewardTier


Money = Annotated[
    Decimal,
    Field(gt=0, max_digits=10, decimal_places=2)
]

class RewardTier(str, enum.Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"

# Base schemas
class RewardBase(BaseModel):
    bill_id: Optional[int] = Field(None, description="Associated bill ID")
    bill_amount: Money
    category: str = Field(..., min_length=1, max_length=100, description="Bill category")
    on_time_payment: bool = Field(default=True, description="Whether payment was made on time")
    description: Optional[str] = Field(None, max_length=500, description="Reward description")

class RewardCreate(RewardBase):
    pass

class RewardUpdate(BaseModel):
    points: Optional[int] = Field(None, ge=0, description="Reward points")
    description: Optional[str] = Field(None, max_length=500, description="Reward description")

class RewardInDBBase(RewardBase):
    id: int
    user_id: int
    points: int
    earned_at: datetime
    
    class Config:
        orm_mode = True
        json_encoders = {
            Decimal: lambda v: str(v),
            datetime: lambda v: v.isoformat()
        }

class RewardResponse(BaseModel):
    id: int
    user_id: int
    bill_id: Optional[int]
    points: int
    bill_amount: Decimal
    category: str
    on_time_payment: bool
    description: Optional[str]
    earned_at: datetime
    tier: RewardTier

    model_config = ConfigDict(from_attributes=True)

# Summary schemas
class MonthlyBreakdown(BaseModel):
    month: str  # Format: "YYYY-MM"
    total_points: int
    reward_count: int
    categories: Dict[str, int]  # Points by category
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class RewardSummary(BaseModel):
    total_points: int
    current_tier: RewardTier
    next_tier: Optional[RewardTier]
    points_to_next_tier: Optional[int]
    recent_rewards: List[RewardResponse]
    monthly_breakdown: List[dict]
    
    model_config = ConfigDict(from_attributes=True)

# Leaderboard schemas
class LeaderboardEntry(BaseModel):
    user_id: int
    username: str
    email: str
    total_points: int
    current_tier: RewardTier
    rank: int
    
    model_config = ConfigDict(from_attributes=True)

# Tier schemas
class TierInfo(BaseModel):
    tier: RewardTier
    min_points: int
    max_points: Optional[int]
    benefits: List[str]
    color: str
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Analytics schemas
class RewardAnalytics(BaseModel):
    total_rewards: int
    total_points: int
    avg_points_per_reward: float
    on_time_payment_rate: float
    top_category: str
    points_by_category: Dict[str, int]
    points_trend: List[Dict[str, Any]]  # Points over time
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# User reward schemas
class UserRewardStats(BaseModel):
    user_id: int
    username: str
    join_date: date
    total_points: int
    current_tier: RewardTier
    streak_days: int
    bills_paid: int
    total_bill_amount: Annotated[Decimal,Field(max_digits=12, decimal_places=2)]

    class Config:
        json_encoders = {
            Decimal: lambda v: str(v),
            date: lambda v: v.isoformat()
        }