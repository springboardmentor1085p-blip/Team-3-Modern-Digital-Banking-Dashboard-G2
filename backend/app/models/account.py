from sqlalchemy import Boolean, Column, Integer, Float, String, Boolean, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_number = Column(String(20), unique=True, index=True, nullable=False)
    account_type = Column(String(20), nullable=False)  # checking, savings, credit
    balance = Column(Numeric(15, 2), default=0.00)
    currency = Column(String(3), default="USD")
    status = Column(String(20), default="active")  # active, inactive, closed
    is_active = Column(Boolean, default=True)
    credit_limit  = Column(Float, default=0.0) 
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Account(id={self.id}, account_number={self.account_number}, balance={self.balance})>"