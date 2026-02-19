from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=30,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()

# Ensure all models are registered with SQLAlchemy metadata
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.bill import Bill
from app.models.reward import Reward
from app.models.alert import Alert
from app.models.admin_log import AdminLog


def get_db():
    """
    Dependency function to get database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()