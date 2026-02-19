from pydantic import BaseModel, Field, validator
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal
from enum import Enum
from pydantic import ConfigDict


class BudgetPeriod(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    WEEKLY = "weekly"


class BudgetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category_id: int = Field(..., gt=0)
    subcategory: Optional[str] = Field(None, max_length=50)
    amount: Decimal = Field(..., gt=0)
    period: BudgetPeriod = BudgetPeriod.MONTHLY
    month: Optional[int] = Field(None, ge=1, le=12)
    year: int = Field(..., ge=2020)
    is_active: bool = True
    
    @validator('month')
    def validate_month_period(cls, v, values):
        if values.get('period') == BudgetPeriod.MONTHLY and v is None:
            raise ValueError('Month is required for monthly budgets')
        if values.get('period') != BudgetPeriod.MONTHLY and v is not None:
            raise ValueError('Month should only be specified for monthly budgets')
        return v


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category_id: Optional[int] = Field(None, gt=0)
    subcategory: Optional[str] = Field(None, max_length=50)
    amount: Optional[Decimal] = Field(None, gt=0)
    period: Optional[BudgetPeriod] = None
    month: Optional[int] = Field(None, ge=1, le=12)
    year: Optional[int] = Field(None, ge=2020)
    is_active: Optional[bool] = None


class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        orm_mode = True


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    parent_category: Optional[str] = Field(None, max_length=50)
    color: str = Field(default="#3B82F6", pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    is_custom: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    user_id: int
    created_at: datetime
    

class BudgetProgress(BaseModel):
    budget_id: int
    budget_name: str
    category: Optional[str] = None
    budget_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    percentage_used: float
    status: str  # under, over, warning
    transactions_count: int


class BudgetSummary(BaseModel):
    total_budget: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    overall_percentage: float
    month: int
    year: int
    category_breakdown: List[dict]
    over_budget_categories: List[dict]
    near_limit_categories: List[dict]
    
    class Config:
        schema_extra = {
            "example": {
                "total_budget": 5000.00,
                "total_spent": 3200.00,
                "total_remaining": 1800.00,
                "overall_percentage": 64.0,
                "month": 11,
                "year": 2024,
                "category_breakdown": [
                    {
                        "category": "Food",
                        "budget": 800.00,
                        "spent": 650.00,
                        "remaining": 150.00,
                        "percentage": 81.25
                    }
                ]
            }
        }