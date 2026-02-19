"""
CRUD operations for Alert model
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from app.crud.base import CRUDBase
from app.models.alert import Alert, AlertStatus, AlertType, EntityType
from app.schemas.alert import AlertCreate, AlertUpdate

class CRUDAlert(CRUDBase[Alert, AlertCreate, AlertUpdate]):
    """CRUD operations for Alert model"""
    
    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[List] = None,
        order_by: Optional[List] = None
    ) -> List[Alert]:
        """Get multiple alerts with optional filtering"""
        query = db.query(self.model)
        
        if filters:
            query = query.filter(*filters)
        
        if order_by:
            query = query.order_by(*order_by)
        else:
            query = query.order_by(desc(self.model.created_at))
        
        return query.offset(skip).limit(limit).all()
    
    def get_by_user(
        self,
        db: Session,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 100,
        unread_only: bool = False,
        status: Optional[AlertStatus] = None
    ) -> List[Alert]:
        """Get alerts for a specific user"""
        filters = [self.model.user_id == user_id]
        
        if unread_only:
            filters.append(self.model.is_read == False)
        
        if status:
            filters.append(self.model.status == status)
        
        return self.get_multi(
            db,
            skip=skip,
            limit=limit,
            filters=filters,
            order_by=[desc(self.model.created_at)]
        )
    
    def get_by_criteria(
        self,
        db: Session,
        *,
        user_id: int,
        alert_type: AlertType,
        entity_type: Optional[EntityType] = None,
        entity_id: Optional[int] = None,
        created_after: Optional[datetime] = None,
        active_only: bool = True
    ) -> Optional[Alert]:
        """Get alert matching specific criteria"""
        filters = [
            self.model.user_id == user_id,
            self.model.alert_type == alert_type
        ]
        
        if entity_type:
            filters.append(self.model.entity_type == entity_type)
        
        if entity_id:
            filters.append(self.model.entity_id == entity_id)
        
        if created_after:
            filters.append(self.model.created_at >= created_after)
        
        if active_only:
            filters.append(self.model.status == AlertStatus.ACTIVE)
        
        return db.query(self.model).filter(*filters).first()
    
    def mark_as_read(
        self,
        db: Session,
        *,
        alert_id: int,
        user_id: Optional[int] = None
    ) -> Optional[Alert]:
        """Mark an alert as read"""
        alert = self.get(db, id=alert_id)
        
        if not alert:
            return None
        
        if user_id and alert.user_id != user_id:
            return None
        
        alert.is_read = True
        alert.acknowledged_at = datetime.now()
        
        db.add(alert)
        db.commit()
        db.refresh(alert)
        
        return alert
    
    def mark_all_as_read(
        self,
        db: Session,
        *,
        user_id: int
    ) -> int:
        """Mark all user's alerts as read"""
        updated = db.query(self.model)\
            .filter(
                self.model.user_id == user_id,
                self.model.is_read == False
            )\
            .update(
                {
                    self.model.is_read: True,
                    self.model.acknowledged_at: datetime.now()
                },
                synchronize_session=False
            )
        
        db.commit()
        return updated
    
    def mark_as_resolved(
        self,
        db: Session,
        *,
        alert_id: int,
        user_id: Optional[int] = None
    ) -> Optional[Alert]:
        """Mark an alert as resolved"""
        alert = self.get(db, id=alert_id)
        
        if not alert:
            return None
        
        if user_id and alert.user_id != user_id:
            return None
        
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.now()
        alert.is_read = True
        
        db.add(alert)
        db.commit()
        db.refresh(alert)
        
        return alert
    
    def dismiss(
        self,
        db: Session,
        *,
        alert_id: int,
        user_id: Optional[int] = None
    ) -> Optional[Alert]:
        """Dismiss an alert"""
        alert = self.get(db, id=alert_id)
        
        if not alert:
            return None
        
        if user_id and alert.user_id != user_id:
            return None
        
        alert.status = AlertStatus.DISMISSED
        alert.is_read = True
        
        db.add(alert)
        db.commit()
        db.refresh(alert)
        
        return alert
    
    def get_stats(
        self,
        db: Session,
        *,
        user_id: int,
        since_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get alert statistics for a user"""
        # Base query for user
        query = db.query(self.model).filter(self.model.user_id == user_id)
        
        if since_date:
            query = query.filter(self.model.created_at >= since_date)
        
        # Total counts
        total_alerts = query.count()
        
        # Status counts
        active_count = query.filter(self.model.status == AlertStatus.ACTIVE).count()
        resolved_count = query.filter(self.model.status == AlertStatus.RESOLVED).count()
        dismissed_count = query.filter(self.model.status == AlertStatus.DISMISSED).count()
        
        # Unread count
        unread_count = query.filter(self.model.is_read == False).count()
        
        # Count by type
        type_counts = {}
        type_query = db.query(self.model.alert_type, func.count(self.model.id))\
            .filter(self.model.user_id == user_id)
        
        if since_date:
            type_query = type_query.filter(self.model.created_at >= since_date)
        
        type_results = type_query.group_by(self.model.alert_type).all()
        for alert_type, count in type_results:
            type_counts[alert_type.value] = count
        
        # Count by severity
        severity_counts = {}
        severity_query = db.query(self.model.severity, func.count(self.model.id))\
            .filter(self.model.user_id == user_id)
        
        if since_date:
            severity_query = severity_query.filter(self.model.created_at >= since_date)
        
        severity_results = severity_query.group_by(self.model.severity).all()
        for severity, count in severity_results:
            severity_counts[severity] = count
        
        # Time-based counts
        today = datetime.now().date()
        week_ago = datetime.now() - timedelta(days=7)
        month_ago = datetime.now() - timedelta(days=30)
        
        today_count = query.filter(
            func.date(self.model.created_at) == today
        ).count()
        
        last_7_days_count = query.filter(
            self.model.created_at >= week_ago
        ).count()
        
        last_30_days_count = query.filter(
            self.model.created_at >= month_ago
        ).count()
        
        return {
            "total_alerts": total_alerts,
            "unread_count": unread_count,
            "active_count": active_count,
            "resolved_count": resolved_count,
            "dismissed_count": dismissed_count,
            "by_type": type_counts,
            "by_severity": severity_counts,
            "today_count": today_count,
            "last_7_days_count": last_7_days_count,
            "last_30_days_count": last_30_days_count
        }
    
    def cleanup_expired(
        self,
        db: Session,
        *,
        user_id: Optional[int] = None,
        batch_size: int = 1000
    ) -> int:
        """Clean up expired alerts"""
        query = db.query(self.model).filter(
            self.model.expires_at <= datetime.now(),
            self.model.status == AlertStatus.ACTIVE
        )
        
        if user_id:
            query = query.filter(self.model.user_id == user_id)
        
        # Get IDs to archive
        expired_alerts = query.limit(batch_size).all()
        
        if not expired_alerts:
            return 0
        
        alert_ids = [alert.id for alert in expired_alerts]
        
        # Update status to archived
        updated = db.query(self.model)\
            .filter(self.model.id.in_(alert_ids))\
            .update(
                {
                    self.model.status: AlertStatus.ARCHIVED,
                    self.model.is_read: True
                },
                synchronize_session=False
            )
        
        db.commit()
        return updated
    
    def create_user_alert(
        self,
        db: Session,
        *,
        user_id: int,
        alert_type: AlertType,
        title: str,
        message: str,
        **kwargs
    ) -> Alert:
        """Create an alert for a user with common defaults"""
        alert_data = {
            "user_id": user_id,
            "alert_type": alert_type,
            "title": title,
            "message": message,
            "severity": kwargs.get("severity", "info"),
            "entity_type": kwargs.get("entity_type"),
            "entity_id": kwargs.get("entity_id"),
            "entity_data": kwargs.get("entity_data"),
            "data": kwargs.get("data"),
            "amount": kwargs.get("amount"),
            "threshold": kwargs.get("threshold"),
            "is_actionable": kwargs.get("is_actionable", True),
            "expires_at": kwargs.get("expires_at")
        }
        
        # Remove None values
        alert_data = {k: v for k, v in alert_data.items() if v is not None}
        
        return self.create(db, obj_in=alert_data)
    
    def bulk_update(
        self,
        db: Session,
        *,
        alert_ids: List[int],
        update_data: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> int:
        """Bulk update alerts"""
        query = db.query(self.model).filter(self.model.id.in_(alert_ids))
        
        if user_id:
            query = query.filter(self.model.user_id == user_id)
        
        updated = query.update(update_data, synchronize_session=False)
        db.commit()
        
        return updated

alert_crud = CRUDAlert(Alert)