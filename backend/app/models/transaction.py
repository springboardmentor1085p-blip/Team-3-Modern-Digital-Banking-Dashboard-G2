from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.core.database import Base


class TransactionType(str, enum.Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER = "transfer"
    PAYMENT = "payment"
    DEBIT = "debit"
    CREDIT = "credit"


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    

    # Core transaction data
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_type = Column(
    Enum(TransactionType, name="transactiontype"),
    nullable=False)
    status = Column(
    Enum(TransactionStatus, name="transactionstatus"),
    default=TransactionStatus.PENDING,
    nullable=False)


    # Descriptive fields
    description = Column(String(255), nullable=True)
    merchant = Column(String(100), nullable=True)
    recipient_account = Column(String(20), nullable=True)
    reference_number = Column(String(50), unique=True, index=True)

    # Categorization (Milestone 2)
    category = Column(String(50), nullable=True, default=None)
    subcategory = Column(String(50), nullable=True, default=None)

    # Dates
    date = Column(Date, nullable=True)
    transaction_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    account = relationship("Account", back_populates="transactions")
    user = relationship("User", back_populates="transactions")


    def __repr__(self):
        return (
            f"<Transaction(id={self.id}, amount={self.amount}, "
            f"type={self.transaction_type}, status={self.status})>"
        )
