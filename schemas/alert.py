"""
Alert Pydantic schemas (Pydantic v2 compatible)
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict
from enum import Enum

from app.models.alert import AlertType, AlertStatus, EntityType


# =========================================================
# Base schemas
# =========================================================

class AlertBase(BaseModel):
    """Base alert schema"""

    alert_type: AlertType
    title: str = Field(..., max_length=255)
    message: str
    severity: str = Field("info", pattern="^(info|warning|critical)$")

    entity_type: Optional[EntityType] = None
    entity_id: Optional[int] = None
    entity_data: Optional[Dict[str, Any]] = None

    data: Optional[Dict[str, Any]] = None
    amount: Optional[float] = None
    threshold: Optional[float] = None

    is_actionable: bool = True
    expires_at: Optional[datetime] = None


# =========================================================
# Create / Update
# =========================================================

class AlertCreate(AlertBase):
    """Schema for creating alerts"""
    pass


class AlertUpdate(BaseModel):
    """Schema for updating alerts"""

    status: Optional[AlertStatus] = None
    is_read: Optional[bool] = None
    action_taken: Optional[bool] = None
    data: Optional[Dict[str, Any]] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        # Example hook for business logic
        return v


# =========================================================
# Response schemas
# =========================================================

class AlertResponse(AlertBase):
    """Full alert response schema"""

    id: int
    user_id: int
    status: AlertStatus
    is_read: bool
    action_taken: bool

    action_taken_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_by: Optional[int] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: lambda v: v.isoformat()}
    )


# ✅ IMPORTANT FIX — alias required by your imports
class Alert(AlertResponse):
    """Compatibility alias for imports expecting `Alert`"""
    pass


class AlertListResponse(BaseModel):
    """Paginated alert list"""

    alerts: List[AlertResponse]
    total: int
    skip: int
    limit: int


class AlertStatsResponse(BaseModel):
    """Alert statistics"""

    total_alerts: int
    unread_count: int
    active_count: int
    resolved_count: int
    dismissed_count: int

    by_type: Dict[str, int]
    by_severity: Dict[str, int]

    today_count: int
    last_7_days_count: int
    last_30_days_count: int


# =========================================================
# Filters
# =========================================================

class AlertFilter(BaseModel):
    """Filtering options"""

    status: Optional[AlertStatus] = None
    alert_type: Optional[AlertType] = None
    severity: Optional[str] = None
    entity_type: Optional[EntityType] = None

    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

    unread_only: bool = False
    actionable_only: bool = False

    model_config = ConfigDict(use_enum_values=True)


# =========================================================
# Webhook payload
# =========================================================

class AlertWebhookPayload(BaseModel):
    """Webhook payload"""

    alert_id: int
    user_id: int
    alert_type: AlertType
    title: str
    message: str
    severity: str
    created_at: datetime

    entity_type: Optional[EntityType] = None
    entity_id: Optional[int] = None
    action_url: Optional[str] = None

    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()}
    )


# =========================================================
# Notification schema
# =========================================================

class AlertNotification(BaseModel):
    """Push/email notification"""

    user_id: int
    alert_id: int
    title: str
    body: str

    priority: str = "normal"
    channel: List[str] = ["push"]

    data: Optional[Dict[str, Any]] = None
    scheduled_for: Optional[datetime] = None


# =========================================================
# Bulk operations
# =========================================================

class BulkAlertUpdate(BaseModel):
    """Bulk update alerts"""

    alert_ids: List[int]
    status: Optional[AlertStatus] = None
    is_read: Optional[bool] = None
    action_taken: Optional[bool] = None

    @field_validator("alert_ids")
    @classmethod
    def validate_alert_ids(cls, v):
        if len(v) > 100:
            raise ValueError("Cannot update more than 100 alerts at once")
        return v


class AlertExportRequest(BaseModel):
    """Export alerts"""

    format: str = Field("csv", pattern="^(csv|json|pdf)$")
    filters: Optional[AlertFilter] = None
    columns: Optional[List[str]] = None

    @field_validator("columns")
    @classmethod
    def validate_columns(cls, v):
        if v:
            valid_columns = {
                "id", "title", "message", "alert_type", "severity",
                "status", "created_at", "is_read", "amount", "entity_type"
            }
            for col in v:
                if col not in valid_columns:
                    raise ValueError(f"Invalid column: {col}")
        return v
