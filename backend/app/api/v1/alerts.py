"""
Alerts and notifications API endpoints
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_

from app.core.database import get_db
from app.models.user import User
from app.models.alert import Alert, AlertStatus, AlertType
from app.schemas.alert import (
    AlertResponse,
    AlertCreate,
    AlertUpdate,
    AlertListResponse,
    AlertStatsResponse
)
from app.crud.alert import CRUDAlert
from app.services.alert_service import AlertService
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/", response_model=AlertListResponse)
async def get_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[AlertStatus] = None,
    alert_type: Optional[AlertType] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get alerts with filtering options
    """
    crud_alert = CRUDAlert(Alert)
    
    # Build filter conditions
    filters = [Alert.user_id == current_user.id]
    
    if status:
        filters.append(Alert.status == status)
    
    if alert_type:
        filters.append(Alert.alert_type == alert_type)
    
    if start_date:
        filters.append(Alert.created_at >= start_date)
    
    if end_date:
        filters.append(Alert.created_at <= end_date)
    
    if unread_only:
        filters.append(Alert.is_read == False)
    
    # Get alerts
    alerts = crud_alert.get_multi(
        db, 
        skip=skip, 
        limit=limit,
        filters=filters,
        order_by=[desc(Alert.created_at)]
    )
    
    # Get total count for pagination
    total = (
        db.query(Alert)
        .filter(*filters)
        .count()
    )

    
    return {
        "alerts": alerts,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get specific alert by ID
    """
    crud_alert = CRUDAlert(Alert)
    alert = crud_alert.get(db, id=alert_id)
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    if alert.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this alert"
        )
    
    return alert

@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_in: AlertCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new alert (typically used by system, not directly by users)
    """
    crud_alert = CRUDAlert(Alert)
    
    # Check if similar alert already exists recently
    existing = crud_alert.get_by_criteria(
        db,
        user_id=current_user.id,
        alert_type=alert_in.alert_type,
        entity_type=alert_in.entity_type,
        entity_id=alert_in.entity_id,
        created_after=datetime.now() - timedelta(hours=24)
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Similar alert already exists"
        )
    
    # Create alert
    alert_data = alert_in.dict()
    alert_data["user_id"] = current_user.id
    alert = crud_alert.create(db, obj_in=alert_data)
    
    return alert

@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: int,
    alert_update: AlertUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update alert (mark as read, change status, etc.)
    """
    crud_alert = CRUDAlert(Alert)
    
    # Get alert
    alert = crud_alert.get(db, id=alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    if alert.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this alert"
        )
    
    # Update alert
    updated_alert = crud_alert.update(db, db_obj=alert, obj_in=alert_update.dict(exclude_unset=True))
    
    return updated_alert

# ✅ PLACE THIS FIRST
@router.patch("/mark-all-read", status_code=status.HTTP_200_OK)
async def mark_all_alerts_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    crud_alert = CRUDAlert(Alert)

    updated = crud_alert.mark_all_as_read(
        db=db,
        user_id=current_user.id
    )

    return {
        "message": "Marked all alerts as read",
        "updated_count": updated
    }


# ⬇️ KEEP THIS AFTER
@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: int,
    alert_update: AlertUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    ...

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete an alert
    """
    crud_alert = CRUDAlert(Alert)
    
    alert = crud_alert.get(db, id=alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    if alert.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this alert"
        )
    
    crud_alert.remove(db, id=alert_id)

@router.get("/stats/summary", response_model=AlertStatsResponse)
async def get_alert_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get alert statistics
    """
    crud_alert = CRUDAlert(Alert)
    
    since_date = datetime.now() - timedelta(days=days)
    
    stats = crud_alert.get_stats(
        db, 
        user_id=current_user.id,
        since_date=since_date
    )
    
    return stats

@router.post("/generate-test")
async def generate_test_alerts(
    count: int = 3,
    alert_type: Optional[AlertType] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate test alerts (for development/testing only)
    """
    alert_service = AlertService(db, current_user.id)
    
    generated = alert_service.generate_test_alerts(
        alert_type=alert_type,
        count=count
    )
    
    return {
        "message": f"Generated {len(generated)} test alerts",
        "alerts": generated,
        "warning": "This endpoint should be disabled in production"
    }

@router.post("/check-and-generate")
async def check_and_generate_alerts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Check conditions and generate alerts based on user's data
    """
    alert_service = AlertService(db, current_user.id)
    
    generated = alert_service.check_and_generate_alerts()
    
    return {
        "message": f"Generated {len(generated)} new alerts",
        "alerts_generated": len(generated)
    }