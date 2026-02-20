"""
Alert database model
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, Enum as SQLEnum, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base

class AlertType(str, Enum):
    """Types of alerts"""
    BUDGET_EXCEEDED = "budget_exceeded"
    LARGE_TRANSACTION = "large_transaction"
    UNUSUAL_SPENDING = "unusual_spending"
    LOW_BALANCE = "low_balance"
    HIGH_BALANCE = "high_balance"
    INCOME_RECEIVED = "income_received"
    BILL_DUE = "bill_due"
    SUBSCRIPTION_RENEWAL = "subscription_renewal"
    SAVINGS_GOAL = "savings_goal"
    CASH_FLOW_WARNING = "cash_flow_warning"
    SYSTEM = "system"
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class AlertStatus(str, Enum):
    """Alert status"""
    ACTIVE = "active"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"
    ARCHIVED = "archived"

class EntityType(str, Enum):
    """Types of entities that can be associated with alerts"""
    TRANSACTION = "transaction"
    ACCOUNT = "account"
    BUDGET = "budget"
    CATEGORY = "category"
    BILL = "bill"
    GOAL = "goal"
    USER = "user"

class Alert(Base):
    """Alert model for storing user notifications and warnings"""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Alert metadata
    alert_type = Column(SQLEnum(AlertType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="info")  # info, warning, critical
    
    # Associated entity
    entity_type = Column(SQLEnum(EntityType), nullable=True)
    entity_id = Column(Integer, nullable=True)
    entity_data = Column(JSON, nullable=True)  # Additional data about the entity
    
    # Alert data
    data = Column(JSON, nullable=True)  # Additional alert data
    amount = Column(Float, nullable=True)  # For financial alerts
    threshold = Column(Float, nullable=True)  # For threshold-based alerts
    
    # Status
    status = Column(SQLEnum(AlertStatus), default=AlertStatus.ACTIVE, index=True)
    is_read = Column(Boolean, default=False, index=True)
    is_actionable = Column(Boolean, default=True)
    action_taken = Column(Boolean, default=False)
    action_taken_at = Column(DateTime, nullable=True)
    
    # Dates
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    
    # Expiration (for time-sensitive alerts)
    expires_at = Column(DateTime, nullable=True)
    
    # User who might have created/modified (for admin alerts)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="alerts")
    creator = relationship("User", foreign_keys=[created_by])
    
    # Indexes
    __table_args__ = (
        Index('idx_alerts_user_status', 'user_id', 'status'),
        Index('idx_alerts_user_read', 'user_id', 'is_read'),
        Index('idx_alerts_entity', 'entity_type', 'entity_id'),
        Index('idx_alerts_created', 'created_at'),
        Index('idx_alerts_expires', 'expires_at'),
    )
    
    def __repr__(self):
        return f"<Alert(id={self.id}, type={self.alert_type}, user_id={self.user_id})>"
    
    def to_dict(self):
        """Convert alert to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "alert_type": self.alert_type,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity_data": self.entity_data,
            "data": self.data,
            "amount": self.amount,
            "threshold": self.threshold,
            "status": self.status,
            "is_read": self.is_read,
            "is_actionable": self.is_actionable,
            "action_taken": self.action_taken,
            "action_taken_at": self.action_taken_at.isoformat() if self.action_taken_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_by": self.created_by
        }
    
    def mark_as_read(self):
        """Mark alert as read"""
        self.is_read = True
        self.acknowledged_at = datetime.now()
    
    def mark_as_resolved(self):
        """Mark alert as resolved"""
        self.status = AlertStatus.RESOLVED
        self.resolved_at = datetime.now()
        self.is_read = True
    
    def mark_as_dismissed(self):
        """Mark alert as dismissed"""
        self.status = AlertStatus.DISMISSED
        self.is_read = True
    
    def is_expired(self):
        """Check if alert is expired"""
        if self.expires_at:
            return datetime.now() > self.expires_at
        return False
    
    def requires_action(self):
        """Check if alert requires user action"""
        return self.is_actionable and not self.action_taken and self.status == AlertStatus.ACTIVE