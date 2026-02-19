from pydantic import BaseModel, Field, validator, condecimal
from typing import Optional, List, Dict, Annotated
from datetime import date, datetime
from decimal import Decimal
import enum
from typing import Any
Amount = Annotated[
    Decimal,
    Field(gt=0, max_digits=10, decimal_places=2)
]

Money = Annotated[
    Decimal,
    Field(max_digits=10, decimal_places=2)
]
class CurrencyCode(str, enum.Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    CAD = "CAD"
    AUD = "AUD"
    INR = "INR"
    SGD = "SGD"

class BillFrequency(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    BIANNUALLY = "biannually"
    ANNUALLY = "annually"
    ONE_TIME = "one_time"

# Base schemas
class BillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the bill")
    description: Optional[str] = Field(None, max_length=1000, description="Bill description")
    amount: Amount
    currency: CurrencyCode = Field(default=CurrencyCode.USD, description="Currency code")
    due_date: date = Field(..., description="Due date for the bill")
    category: str = Field(..., min_length=1, max_length=100, description="Bill category")
    frequency: BillFrequency = Field(default=BillFrequency.MONTHLY, description="Payment frequency")
    reminder_days: int = Field(default=3, ge=0, le=30, description="Days before due date to send reminder")


class BillCreate(BillBase):
    @validator("due_date")
    def due_date_must_be_future_or_today(cls, v):
        if v < date.today():
            raise ValueError("Due date must be today or in the future")
        return v

class BillUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    amount: Optional[Amount] = None
    currency: Optional[CurrencyCode] = None
    due_date: Optional[date] = None
    is_paid: Optional[bool] = None
    paid_date: Optional[date] = None
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    frequency: Optional[BillFrequency] = None
    reminder_days: Optional[int] = Field(None, ge=0, le=30)
    
    @validator('due_date')
    def validate_due_date(cls, v):
        if v and v < date.today():
            raise ValueError('Due date must be today or in the future')
        return v
    
    @validator('paid_date')
    def validate_paid_date(cls, v, values):
        if v and 'due_date' in values and values['due_date'] and v > values['due_date']:
            raise ValueError('Paid date cannot be after due date')
        return v

class BillInDBBase(BillBase):
    id: int
    user_id: int
    amount_usd: Money
    is_paid: bool
    paid_date: Optional[date]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True
        json_encoders = {
            Decimal: lambda v: str(v),
            date: lambda v: v.isoformat(),
            datetime: lambda v: v.isoformat()
        }

class BillResponse(BillInDBBase):
    days_until_due: Optional[int] = None
    is_overdue: bool = False
    should_remind: bool = False
    
    @classmethod
    def from_orm(cls, obj: Any):
        # Calculate dynamic properties
        instance = super().from_orm(obj)
        instance.days_until_due = obj.days_until_due
        instance.is_overdue = obj.is_overdue
        instance.should_remind = obj.should_remind
        return instance

# Summary schemas
class CategoryBreakdown(BaseModel):
    category: str
    total_amount: Decimal
    bill_count: int
    paid_count: int
    unpaid_count: int

class BillSummary(BaseModel):
    total_bills: int
    total_amount: Decimal
    paid_bills: int
    unpaid_bills: int
    category_breakdown: List[CategoryBreakdown]
    
    class Config:
        json_encoders = {
            Decimal: lambda v: str(v)
        }

# Filter schemas
class BillFilters(BaseModel):
    category: Optional[str] = None
    is_paid: Optional[bool] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    frequency: Optional[BillFrequency] = None
    
    class Config:
        json_encoders = {
            Decimal: lambda v: str(v)
        }

# Analytics schemas
class MonthlyAnalytics(BaseModel):
    month: str  # Format: "YYYY-MM"
    total_amount: Decimal
    bill_count: int
    paid_amount: Decimal
    unpaid_amount: Decimal
    
    class Config:
        json_encoders = {
            Decimal: lambda v: str(v)
        }

class SpendingByCategory(BaseModel):
    category: str
    total_amount: Decimal
    percentage: float
    
    class Config:
        json_encoders = {
            Decimal: lambda v: str(v)
        }