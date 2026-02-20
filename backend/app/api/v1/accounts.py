from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.crud.account import (
    create_account,
    get_accounts,
    get_account,
    update_account,
    delete_account
)
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[AccountResponse])
def read_accounts( 
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all accounts for current user"""
    accounts = get_accounts(db, user_id=current_user.id, skip=skip, limit=limit)
    return accounts

@router.post("", response_model=AccountResponse)
def create_new_account(
    account_data: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new account for current user"""
    return create_account(db, account_data, user_id=current_user.id)

@router.get("/{account_id}", response_model=AccountResponse)
def read_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific account by ID"""
    account = get_account(db, account_id=account_id, user_id=current_user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Check if account belongs to current user
    if account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return account

@router.put("/{account_id}", response_model=AccountResponse)
def update_existing_account(
    account_id: int,
    account_data: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an account"""
    account = get_account(db, account_id=account_id, user_id=current_user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Check if account belongs to current user
    if account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return update_account(db, account=account, account_data=account_data)

@router.delete("/{account_id}")
def delete_existing_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an account"""
    account = get_account(db, account_id=account_id, user_id=current_user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Check if account belongs to current user
    if account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    delete_account(db, account_id=account_id)
    return {"message": "Account deleted successfully"}