from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate


class CRUDTransaction:
    def get(self, db: Session, id: int):
        return db.query(Transaction).filter(Transaction.id == id).first()

    def get_by_user(self, db: Session, user_id: int, skip: int, limit: int):
        return (
            db.query(Transaction)
            .join(Transaction.account)
            .filter(Transaction.account.has(user_id=user_id))
            .order_by(Transaction.transaction_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_account(self, db: Session, account_id: int, skip: int, limit: int):
        return (
            db.query(Transaction)
            .filter(Transaction.account_id == account_id)
            .order_by(Transaction.transaction_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, db: Session, *, obj_in: TransactionCreate):
        db_obj = Transaction(
            account_id=obj_in.account_id,
            amount=obj_in.amount,
            transaction_type=obj_in.transaction_type,
            description=obj_in.description,
            recipient_account=obj_in.recipient_account,
            transaction_date=obj_in.transaction_date,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


transaction_crud = CRUDTransaction()


# ===============================
# API-FACING FUNCTIONS
# ===============================

def create_transaction(db: Session, *, obj_in: TransactionCreate):
    return transaction_crud.create(db=db, obj_in=obj_in)


def get_transactions(
    db: Session,
    *,
    user_id: int = None,
    account_id: int = None,
    skip: int = 0,
    limit: int = 100
):
    if account_id is not None:
        return transaction_crud.get_by_account(db, account_id, skip, limit)

    if user_id is not None:
        return transaction_crud.get_by_user(db, user_id, skip, limit)

    return []


def get_transaction(db: Session, *, transaction_id: int):
    return transaction_crud.get(db=db, id=transaction_id)
