from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime

from app.models.budget import Budget
from app.models.category import Category
from app.schemas.budget import BudgetCreate, BudgetPeriod, BudgetUpdate, CategoryCreate


class CRUDBudget:

    def create(self, db: Session, *, obj_in: BudgetCreate, user_id: int) -> Budget:
        db_budget = Budget(
            user_id=user_id,
            **obj_in.dict()
        )
        db.add(db_budget)
        db.commit()
        db.refresh(db_budget)
        return db_budget

    def get(self, db: Session, *, budget_id: int, user_id: int) -> Optional[Budget]:
        return db.query(Budget).filter(
            and_(
                Budget.id == budget_id,
                Budget.user_id == user_id
            )
        ).first()

    def get_multi(
        self,
        db: Session,
        *,
        user_id: int,
        month: Optional[int] = None,
        year: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> List[Budget]:

        query = db.query(Budget).filter(Budget.user_id == user_id)

        if is_active is not None:
            query = query.filter(Budget.is_active == is_active)

        if year:
            query = query.filter(Budget.year == year)

        if month:
            query = query.filter(
                or_(
                    Budget.month == month,
                    Budget.period != BudgetPeriod.MONTHLY

                )
            )

        return query.order_by(
            Budget.year.desc(),
            Budget.month.desc(),
            Budget.created_at.desc()
        ).all()

    def update(
        self,
        db: Session,
        *,
        db_obj: Budget,
        obj_in: BudgetUpdate
    ) -> Budget:

        update_data = obj_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, budget_id: int, user_id: int) -> bool:
        budget = self.get(db, budget_id=budget_id, user_id=user_id)
        if not budget:
            return False

        db.delete(budget)
        db.commit()
        return True

    # -------- Budget Categories -------- #

    def create_category(
        self,
        db: Session,
        *,
        obj_in: CategoryCreate
    ) -> Category:

        db_category = Category(
            **obj_in.dict()
    )


    def get_categories(self, db: Session) -> List[Category]:
        return db.query(Category).order_by(Category.name).all()


    def remove_category(
        self,
        db: Session,
        *,
        category_id: int
    ) -> bool:

        category = db.query(Category).filter(
            Category.id == category_id
        ).first()


    def get_current_month_budget(
        self,
        db: Session,
        *,
        user_id: int,
        category_id: int,
        subcategory: Optional[str] = None
    ) -> Optional[Budget]:

        now = datetime.now()

        query = db.query(Budget).filter(
            and_(
                Budget.user_id == user_id,
                Budget.category_id == category_id,
                Budget.is_active.is_(True),
                Budget.year == now.year,
                Budget.period == 'monthly'
            )
        )

        if subcategory:
            query = query.filter(Budget.subcategory == subcategory)
        else:
            query = query.filter(Budget.subcategory.is_(None))

        query = query.filter(
            or_(
                Budget.month == now.month,
                Budget.period != BudgetPeriod.MONTHLY

            )
        )

        return query.first()


budget_crud = CRUDBudget()

# ==================================================
# API-compatible CRUD function wrappers
# (delegates to CRUDBudget)
# ==================================================

def create_budget(db: Session, *, obj_in: BudgetCreate, user_id: int):
    return budget_crud.create(db, obj_in=obj_in, user_id=user_id)


def get_budget(db: Session, *, budget_id: int, user_id: int):
    return budget_crud.get(db, budget_id=budget_id, user_id=user_id)


def get_budgets(
    db: Session,
    *,
    user_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
    is_active: Optional[bool] = None,
):
    return budget_crud.get_multi(
        db,
        user_id=user_id,
        month=month,
        year=year,
        is_active=is_active,
    )


def update_budget(
    db: Session,
    *,
    budget_id: int,
    obj_in: BudgetUpdate,
    user_id: int,
):
    budget = budget_crud.get(db, budget_id=budget_id, user_id=user_id)
    if not budget:
        return None
    return budget_crud.update(db, db_obj=budget, obj_in=obj_in)


def delete_budget(db: Session, *, budget_id: int, user_id: int):
    return budget_crud.remove(db, budget_id=budget_id, user_id=user_id)


def create_budget_category(db: Session, *, obj_in: CategoryCreate):
    return budget_crud.create_category(db, obj_in=obj_in)


def get_budget_categories(db: Session):
    return budget_crud.get_categories(db)



def delete_budget_category(db: Session, *, category_id: int):
    return budget_crud.remove_category(db, category_id=category_id)
