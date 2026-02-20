"""
Cash flow insights and analytics API endpoints
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
from enum import Enum

from app.core.database import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.models.alert import Alert
from app.schemas.insight import (
    CashFlowInsightResponse,
    CategoryInsightResponse,
    TrendInsightResponse,
    MonthlySummaryResponse,
    InsightCategory
)
from app.services.insight_service import InsightService
from app.api.deps import get_current_active_user

router = APIRouter()

class TimeRange(str, Enum):
    LAST_7_DAYS = "7d"
    LAST_30_DAYS = "30d"
    LAST_90_DAYS = "90d"
    THIS_MONTH = "month"
    THIS_YEAR = "year"
    CUSTOM = "custom"

@router.get("/cash-flow", response_model=CashFlowInsightResponse)
async def get_cash_flow_insights(
    time_range: TimeRange = TimeRange.LAST_30_DAYS,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get cash flow insights including income, expenses, and net cash flow
    """
    # Validate custom date range
    if time_range == TimeRange.CUSTOM:
        if not start_date or not end_date:
            raise HTTPException(
                status_code=400,
                detail="start_date and end_date required for custom range"
            )
        if start_date > end_date:
            raise HTTPException(
                status_code=400,
                detail="start_date must be before end_date"
            )
        if (end_date - start_date).days > 365:
            raise HTTPException(
                status_code=400,
                detail="Date range cannot exceed 365 days"
            )
    else:
        end_date = datetime.now()
        if time_range == TimeRange.LAST_7_DAYS:
            start_date = end_date - timedelta(days=7)
        elif time_range == TimeRange.LAST_30_DAYS:
            start_date = end_date - timedelta(days=30)
        elif time_range == TimeRange.LAST_90_DAYS:
            start_date = end_date - timedelta(days=90)
        elif time_range == TimeRange.THIS_MONTH:
            start_date = datetime(end_date.year, end_date.month, 1)
        elif time_range == TimeRange.THIS_YEAR:
            start_date = datetime(end_date.year, 1, 1)
    
    insight_service = InsightService(db, current_user.id)
    insights = insight_service.get_cash_flow_insights(start_date, end_date)
    
    return insights

@router.get("/category-breakdown", response_model=List[CategoryInsightResponse])
async def get_category_breakdown(
    insight_type: InsightCategory = InsightCategory.EXPENSE,
    time_range: TimeRange = TimeRange.LAST_30_DAYS,
    limit: int = Query(10, ge=1, le=20),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get breakdown of transactions by category
    """
    end_date = datetime.now()
    if time_range == TimeRange.LAST_7_DAYS:
        start_date = end_date - timedelta(days=7)
    elif time_range == TimeRange.LAST_30_DAYS:
        start_date = end_date - timedelta(days=30)
    elif time_range == TimeRange.LAST_90_DAYS:
        start_date = end_date - timedelta(days=90)
    elif time_range == TimeRange.THIS_MONTH:
        start_date = datetime(end_date.year, end_date.month, 1)
    elif time_range == TimeRange.THIS_YEAR:
        start_date = datetime(end_date.year, 1, 1)
    else:
        start_date = end_date - timedelta(days=30)
    
    insight_service = InsightService(db, current_user.id)
    breakdown = insight_service.get_category_breakdown(
        start_date, end_date, insight_type.value, limit
    )
    
    return breakdown

@router.get("/trends", response_model=List[TrendInsightResponse])
async def get_trend_insights(
    metric: str = Query("expenses", pattern="^(expenses|income|net_flow)$"),
    period: str = Query("monthly", pattern="^(daily|weekly|monthly|quarterly)$"),
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get trend data for cash flow metrics over time
    """
    insight_service = InsightService(db, current_user.id)
    trends = insight_service.get_trend_insights(metric, period, months)
    
    return trends

@router.get("/monthly-summary", response_model=List[MonthlySummaryResponse])
async def get_monthly_summary(
    year: int = Query(None, ge=2020, le=2100),
    months: int = Query(12, ge=1, le=24),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get monthly summary of income, expenses, and net cash flow
    """
    if not year:
        year = datetime.now().year
    
    insight_service = InsightService(db, current_user.id)
    summary = insight_service.get_monthly_summary(year, months)
    
    return summary

@router.get("/anomalies")
async def detect_anomalies(
    threshold: float = Query(2.0, ge=1.5, le=5.0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Detect anomalous transactions based on statistical analysis
    """
    insight_service = InsightService(db, current_user.id)
    anomalies = insight_service.detect_anomalies(threshold)
    
    return {
        "anomalies": anomalies,
        "total_detected": len(anomalies),
        "threshold_used": threshold
    }

@router.get("/predictions")
async def get_predictions(
    horizon: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Predict future cash flow based on historical data
    """
    insight_service = InsightService(db, current_user.id)
    predictions = insight_service.predict_cash_flow(horizon)
    
    return {
        "predictions": predictions,
        "horizon_days": horizon,
        "generated_at": datetime.now().isoformat()
    }

@router.get("/spending-habits")
async def analyze_spending_habits(
    time_range: TimeRange = TimeRange.LAST_90_DAYS,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Analyze spending habits and patterns
    """
    end_date = datetime.now()
    if time_range == TimeRange.LAST_7_DAYS:
        start_date = end_date - timedelta(days=7)
    elif time_range == TimeRange.LAST_30_DAYS:
        start_date = end_date - timedelta(days=30)
    elif time_range == TimeRange.LAST_90_DAYS:
        start_date = end_date - timedelta(days=90)
    elif time_range == TimeRange.THIS_MONTH:
        start_date = datetime(end_date.year, end_date.month, 1)
    else:
        start_date = end_date - timedelta(days=90)
    
    insight_service = InsightService(db, current_user.id)
    habits = insight_service.analyze_spending_habits(start_date, end_date)
    
    return habits