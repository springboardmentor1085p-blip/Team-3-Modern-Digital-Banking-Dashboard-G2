from typing import Optional
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    username: str
    email: EmailStr
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True


# ✅ Alias expected by auth.py
UserResponse = UserRead


# ✅ Token schema expected by auth.py
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
