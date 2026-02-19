"""
Insight and analytics Pydantic schemas
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum

class InsightCategory(str, Enum):
    """Categories for insights"""
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"
    ALL = "all"

class TimePeriod(str, Enum):
    """Time periods for analysis"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

# Cash Flow Insights
class CashFlowInsightResponse(BaseModel):
    """Cash flow insights response"""
    period_start: datetime
    period_end: datetime
    total_income: float = Field(..., description="Total income in period")
    total_expenses: float = Field(..., description="Total expenses in period")
    net_cash_flow: float = Field(..., description="Net cash flow (income - expenses)")
    avg_daily_income: Optional[float] = None
    avg_daily_expenses: Optional[float] = None
    largest_income: Optional[float] = None
    largest_expense: Optional[float] = None
    income_transaction_count: int
    expense_transaction_count: int
    most_frequent_category: Optional[str] = None
    cash_flow_trend: str = Field(..., description="Trend: increasing, decreasing, stable")
    savings_rate: Optional[float] = Field(None, ge=0, le=100, description="Savings rate percentage")
    month_over_month_growth: Optional[float] = None
    year_over_year_growth: Optional[float] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }

# Category Breakdown
class CategoryInsightResponse(BaseModel):
    """Category breakdown response"""
    category: str
    amount: float
    percentage: float = Field(..., ge=0, le=100)
    transaction_count: int
    avg_transaction_amount: float
    trend: Optional[str] = None  # up, down, stable
    prev_period_amount: Optional[float] = None
    change_percentage: Optional[float] = None
    
    class Config:
        orm_mode = True

# Trend Insights
class TrendInsightResponse(BaseModel):
    """Trend insight data point"""
    period: str  # e.g., "2024-01", "2024-W01"
    period_start: date
    period_end: date
    value: float
    prev_period_value: Optional[float] = None
    growth_percentage: Optional[float] = None
    is_estimated: bool = False
    
    class Config:
        json_encoders = {
            date: lambda v: v.isoformat()
        }

# Monthly Summary
class MonthlySummaryResponse(BaseModel):
    """Monthly financial summary"""
    year: int
    month: int
    month_name: str
    total_income: float
    total_expenses: float
    net_cash_flow: float
    savings_rate: float
    top_category: Optional[str] = None
    top_category_amount: Optional[float] = None
    transaction_count: int
    avg_daily_spend: float
    
    class Config:
        orm_mode = True

# Anomaly Detection
class AnomalyResponse(BaseModel):
    """Anomaly detection result"""
    transaction_id: int
    date: datetime
    amount: float
    category: str
    description: str
    deviation_score: float = Field(..., ge=0, description="How anomalous (higher = more anomalous)")
    reason: str
    suggested_action: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Predictions
class PredictionResponse(BaseModel):
    """Cash flow prediction"""
    date: date
    predicted_income: Optional[float] = None
    predicted_expenses: Optional[float] = None
    predicted_net_flow: Optional[float] = None
    confidence_interval_low: Optional[float] = None
    confidence_interval_high: Optional[float] = None
    is_weekend: bool = False
    is_holiday: bool = False
    
    class Config:
        json_encoders = {
            date: lambda v: v.isoformat()
        }

# Spending Habits
class SpendingHabitResponse(BaseModel):
    """Spending habit analysis"""
    habit_type: str  # e.g., "weekday_spending", "time_of_day", "merchant_pattern"
    pattern: Dict[str, Any]
    insights: List[str]
    recommendations: List[str]
    strength_score: float = Field(..., ge=0, le=1, description="How strong the pattern is")

# Budget Insights
class BudgetInsightResponse(BaseModel):
    """Budget-related insights"""
    budget_id: int
    category: str
    budgeted_amount: float
    actual_amount: float
    remaining_amount: float
    utilization_percentage: float
    days_remaining: int
    projected_overspend: Optional[float] = None
    on_track: bool
    alerts: List[str] = []

# Comparison Insights
class ComparisonInsightResponse(BaseModel):
    """Comparison insights (vs previous period, vs average, etc.)"""
    current_period_value: float
    comparison_period_value: float
    change_amount: float
    change_percentage: float
    comparison_type: str  # "previous_period", "same_period_last_year", "average"
    is_improvement: bool
    significance: str  # "low", "medium", "high"

# Request schemas
class InsightRequest(BaseModel):
    """Base insight request"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    category: Optional[str] = None
    account_id: Optional[int] = None
    
    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and values['start_date'] and v:
            if v < values['start_date']:
                raise ValueError('end_date must be after start_date')
            if (v - values['start_date']).days > 365:
                raise ValueError('Date range cannot exceed 365 days')
        return v

class TrendRequest(InsightRequest):
    """Trend analysis request"""
    metric: str = Field("expenses", pattern="^(income|expenses|net_flow)$")
    period: TimePeriod = TimePeriod.MONTHLY
    months: int = Field(6, ge=1, le=24)

# Response wrapper
class InsightSummaryResponse(BaseModel):
    """Comprehensive insight summary"""
    cash_flow: CashFlowInsightResponse
    category_breakdown: List[CategoryInsightResponse]
    top_insights: List[Dict[str, Any]]
    recommendations: List[str]
    generated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }