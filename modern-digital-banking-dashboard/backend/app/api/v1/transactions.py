from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.crud.transaction import (
    create_transaction,
    get_transactions,
    get_transaction
)
from app.models.user import User
from app.models.account import Account

router = APIRouter()


@router.get("/", response_model=List[TransactionResponse])
def read_transactions(
    skip: int = 0,
    limit: int = 100,
    account_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all transactions for current user
    """
    # Validate account ownership if account_id provided
    if account_id is not None:
        account = db.query(Account).filter(
            Account.id == account_id,
            Account.user_id == current_user.id
        ).first()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not found or access denied"
            )

        return get_transactions(
            db=db,
            account_id=account_id,
            skip=skip,
            limit=limit
        )

    # If no account_id → return all user transactions
    return get_transactions(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=TransactionResponse)
def create_new_transaction(
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    account = db.query(Account).filter(
        Account.id == transaction_data.account_id,
        Account.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not found or access denied"
        )

    return create_transaction(db=db, obj_in=transaction_data)


@router.get("/{transaction_id}", response_model=TransactionResponse)
def read_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    transaction = get_transaction(db=db, transaction_id=transaction_id)

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    if transaction.account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    return transaction
