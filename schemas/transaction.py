from enum import Enum
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from decimal import Decimal

class TransactionTypeEnum(str, Enum):
    deposit = "deposit"
    withdrawal = "withdrawal"
    transfer = "transfer"
    payment = "payment"
    debit = "debit"
    credit = "credit"

class TransactionStatusEnum(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"

class TransactionBase(BaseModel):
    amount: Decimal
    description: Optional[str] = None
    transaction_type: TransactionTypeEnum
    recipient_account: Optional[str] = None

class TransactionCreate(TransactionBase):
    account_id: int
    transaction_date: Optional[datetime] = None
    
    @validator('amount')
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    transaction_type: Optional[TransactionTypeEnum] = None
    recipient_account: Optional[str] = None
    status: Optional[TransactionStatusEnum] = None


class TransactionResponse(TransactionBase):
    id: int
    account_id: int
    status: TransactionStatusEnum
    reference_number: str
    transaction_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True