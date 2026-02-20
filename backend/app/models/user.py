from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Float,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # -------------------------
    # Authentication
    # -------------------------
    username = Column(String(50), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_superuser = Column(Boolean, default=False)

    # -------------------------
    # Profile
    # -------------------------
    full_name = Column(String(100), nullable=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    currency = Column(String(10), default="USD")
    monthly_income = Column(Float, default=0)

    # -------------------------
    # Status / Timestamps
    # -------------------------
    is_active = Column(Boolean, default=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=datetime.utcnow,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        default=datetime.utcnow,
    )

    # -------------------------
    # Analytics / Preferences
    # -------------------------
    last_insights_generation = Column(DateTime, nullable=True)
    insights_preferences = Column(JSON, nullable=True)
    alert_preferences = Column(JSON, nullable=True)
    export_history = Column(JSON, nullable=True)

    # -------------------------
    # Relationships
    # -------------------------
    accounts = relationship(
        "Account",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    transactions = relationship(
        "Transaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    budgets = relationship(
        "Budget",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    bills = relationship(
        "Bill",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    rewards = relationship(
        "Reward",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    alerts = relationship(
        "Alert",
        foreign_keys="[Alert.user_id]",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    admin_actions = relationship(
        "AdminLog",
        foreign_keys="[AdminLog.admin_id]",
        back_populates="admin",
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"
