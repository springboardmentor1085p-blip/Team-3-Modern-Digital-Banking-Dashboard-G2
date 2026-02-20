from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class CRUDUser:
    def get_by_username(self, db: Session, *, username: str):
        return db.query(User).filter(User.username == username).first()

    def get(self, db: Session, id: int):
        return db.query(User).filter(User.id == id).first()

    def create(self, db: Session, *, obj_in: UserCreate):
        db_obj = User(
            username=obj_in.username,
            email=obj_in.email,
            is_active=True,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, *, db_obj: User, obj_in: UserUpdate):
        for field, value in obj_in.dict(exclude_unset=True).items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj


# instance
user_crud = CRUDUser()


# ✅ FUNCTIONS EXPECTED BY auth.py (WRAPPERS)

def get_user_by_username(db: Session, username: str):
    return user_crud.get_by_username(db, username=username)


def create_user(db: Session, user_in: UserCreate):
    return user_crud.create(db, obj_in=user_in)
