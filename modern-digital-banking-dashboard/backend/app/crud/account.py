from sqlalchemy.orm import Session
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate


class CRUDAccount:
    def get(self, db: Session, id: int):
        return db.query(Account).filter(Account.id == id).first()

    def get_by_user(self, db: Session, user_id: int):
        return db.query(Account).filter(Account.user_id == user_id).all()

    def create(self, db: Session, *, obj_in: AccountCreate, user_id: int):
        db_obj = Account(
            user_id=user_id,
            account_type=obj_in.account_type,
            balance=obj_in.balance,
            currency=obj_in.currency,
            status=obj_in.status,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: Account, obj_in: AccountUpdate):
        for field, value in obj_in.dict(exclude_unset=True).items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int):
        obj = db.query(Account).filter(Account.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj


# ✅ instance
account_crud = CRUDAccount()


# =========================================================
# ✅ FUNCTION WRAPPERS (USED BY API)
# =========================================================

def create_account(db: Session, account_in: AccountCreate, user_id: int):
    return account_crud.create(db, obj_in=account_in, user_id=user_id)


def get_accounts(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100
):
    return (
        db.query(Account)
        .filter(Account.user_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_account(db: Session, account_id: int, user_id: int):
    return (
        db.query(Account)
        .filter(
            Account.id == account_id,
            Account.user_id == user_id
        )
        .first()
    )


def update_account(db: Session, account_id: int, account_in: AccountUpdate):
    db_obj = account_crud.get(db, id=account_id)
    if not db_obj:
        return None
    return account_crud.update(db, db_obj=db_obj, obj_in=account_in)


def delete_account(db: Session, account_id: int):
    return account_crud.remove(db, id=account_id)
