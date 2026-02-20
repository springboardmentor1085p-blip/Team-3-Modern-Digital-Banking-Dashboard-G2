from sqlalchemy import Column, Integer, String, Numeric, Boolean, Date, DateTime, Enum, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from decimal import Decimal
import enum

from app.core.database import Base

class BillFrequency(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    BIANNUALLY = "biannually"
    ANNUALLY = "annually"
    ONE_TIME = "one_time"

class CurrencyCode(str, enum.Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    CAD = "CAD"
    AUD = "AUD"
    INR = "INR"
    SGD = "SGD"

class Bill(Base):
    __tablename__ = "bills"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)  # Original amount
    currency = Column(Enum(CurrencyCode), default=CurrencyCode.USD, nullable=False)
    amount_usd = Column(Numeric(10, 2), nullable=False)  # Converted to USD for consistency
    due_date = Column(Date, nullable=False, index=True)
    is_paid = Column(Boolean, default=False, index=True)
    paid_date = Column(Date, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    frequency = Column(Enum(BillFrequency), default=BillFrequency.MONTHLY, nullable=False)
    reminder_days = Column(Integer, default=3, nullable=False)  # Days before due date to send reminder
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="bills")
    reward = relationship("Reward", back_populates="bill", uselist=False, cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_bills_user_due', 'user_id', 'due_date'),
        Index('idx_bills_user_category', 'user_id', 'category'),
        Index('idx_bills_user_paid', 'user_id', 'is_paid'),
    )
    
    def __repr__(self):
        return f"<Bill(id={self.id}, name='{self.name}', amount={self.amount}, due_date={self.due_date})>"
    
    @property
    def days_until_due(self):
        """Calculate days until due date"""
        from datetime import date
        if self.due_date:
            return (self.due_date - date.today()).days
        return None
    
    @property
    def is_overdue(self):
        """Check if bill is overdue"""
        from datetime import date
        if not self.is_paid and self.due_date:
            return self.due_date < date.today()
        return False
    
    @property
    def should_remind(self):
        """Check if reminder should be sent"""
        from datetime import date, timedelta
        if not self.is_paid and self.due_date:
            reminder_date = self.due_date - timedelta(days=self.reminder_days)
            return date.today() >= reminder_date
        return False
    
    def to_dict(self):
        """Convert bill to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "amount": float(self.amount) if self.amount else None,
            "currency": self.currency.value if self.currency else None,
            "amount_usd": float(self.amount_usd) if self.amount_usd else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "is_paid": self.is_paid,
            "paid_date": self.paid_date.isoformat() if self.paid_date else None,
            "category": self.category,
            "frequency": self.frequency.value if self.frequency else None,
            "reminder_days": self.reminder_days,
            "days_until_due": self.days_until_due,
            "is_overdue": self.is_overdue,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }