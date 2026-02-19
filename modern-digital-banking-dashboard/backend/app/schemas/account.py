from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime
from decimal import Decimal

class AccountBase(BaseModel):
    account_type: str
    balance: Decimal = Decimal('0.00')
    currency: str = "USD"
    status: str = "active"

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    account_type: Optional[str] = None
    status: Optional[str] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v and v not in ['active', 'inactive', 'closed']:
            raise ValueError('Status must be active, inactive, or closed')
        return v

class AccountResponse(AccountBase):
    id: int
    user_id: int
    account_number: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True