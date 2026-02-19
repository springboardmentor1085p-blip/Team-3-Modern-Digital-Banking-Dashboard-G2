"""
Admin audit log database model
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum as SQLEnum, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base

class AdminAction(str, Enum):
    """Types of admin actions"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    EXPORT = "export"
    VIEW = "view"
    LOGIN = "login"
    LOGOUT = "logout"
    SUSPEND = "suspend"
    ACTIVATE = "activate"
    RESET_PASSWORD = "reset_password"
    CHANGE_ROLE = "change_role"
    BULK_ACTION = "bulk_action"

class ResourceType(str, Enum):
    """Types of resources admin can act upon"""
    USER = "user"
    TRANSACTION = "transaction"
    ACCOUNT = "account"
    CATEGORY = "category"
    BUDGET = "budget"
    ALERT = "alert"
    REPORT = "report"
    EXPORT = "export"
    SYSTEM = "system"

class AdminLog(Base):
    """Admin audit log for tracking admin actions"""
    __tablename__ = "admin_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Admin user who performed the action
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    admin_email = Column(String(255), nullable=False)  # Store email for reference even if admin is deleted
    
    # Action details
    action = Column(SQLEnum(AdminAction), nullable=False, index=True)
    resource_type = Column(SQLEnum(ResourceType), nullable=False, index=True)
    resource_id = Column(Integer, nullable=True, index=True)
    resource_name = Column(String(255), nullable=True)  # Human-readable resource name
    
    # Action data
    details = Column(Text, nullable=True)  # Human-readable description
    changes = Column(JSON, nullable=True)  # JSON of changes made (for updates)
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)
    
    # Target user (if action affects a specific user)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Status
    status = Column(String(20), default="success")  # success, failed, partial
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), index=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    admin = relationship("User", foreign_keys=[admin_id], back_populates="admin_actions")
    target_user = relationship("User", foreign_keys=[target_user_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_admin_logs_admin_date', 'admin_id', 'created_at'),
        Index('idx_admin_logs_resource', 'resource_type', 'resource_id'),
        Index('idx_admin_logs_target_user', 'target_user_id', 'created_at'),
        Index('idx_admin_logs_action_date', 'action', 'created_at'),
    )
    
    def __repr__(self):
        return f"<AdminLog(id={self.id}, admin={self.admin_email}, action={self.action})>"
    
    def to_dict(self):
        """Convert log entry to dictionary"""
        return {
            "id": self.id,
            "admin_id": self.admin_id,
            "admin_email": self.admin_email,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "resource_name": self.resource_name,
            "details": self.details,
            "changes": self.changes,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "target_user_id": self.target_user_id,
            "status": self.status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }
    
    @classmethod
    def create_log(cls, db, admin_id, admin_email, action, resource_type, **kwargs):
        """Helper method to create a log entry"""
        log = cls(
            admin_id=admin_id,
            admin_email=admin_email,
            action=action,
            resource_type=resource_type,
            resource_id=kwargs.get('resource_id'),
            resource_name=kwargs.get('resource_name'),
            details=kwargs.get('details'),
            changes=kwargs.get('changes'),
            ip_address=kwargs.get('ip_address'),
            user_agent=kwargs.get('user_agent'),
            target_user_id=kwargs.get('target_user_id'),
            status=kwargs.get('status', 'success'),
            error_message=kwargs.get('error_message'),
            completed_at=func.now() if kwargs.get('completed_at', True) else None
        )
        
        db.add(log)
        db.commit()
        db.refresh(log)
        
        return log
    
    def mark_completed(self, status="success", error_message=None):
        """Mark log as completed"""
        self.status = status
        self.error_message = error_message
        self.completed_at = datetime.now()