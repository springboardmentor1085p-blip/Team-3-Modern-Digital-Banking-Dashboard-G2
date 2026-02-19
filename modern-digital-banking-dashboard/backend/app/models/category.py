from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    #user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(50), nullable=False)
    #type = Column(String(20), nullable=False)  # income / expense

    budgets = relationship(
        "Budget",
        back_populates="category",
        cascade="all, delete-orphan"
    )

    #user = relationship("User", back_populates="categories")
