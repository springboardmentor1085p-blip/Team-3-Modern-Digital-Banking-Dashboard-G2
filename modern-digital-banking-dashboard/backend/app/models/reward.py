from sqlalchemy import Column, Integer, String, Numeric, Boolean, Date, DateTime, Enum, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from decimal import Decimal
import enum

from app.core.database import Base

class RewardTier(str, enum.Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"

class Reward(Base):
    __tablename__ = "rewards"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Reward details
    points = Column(Integer, nullable=False, default=0)
    bill_amount = Column(Numeric(10, 2), nullable=False)  # Bill amount in USD
    category = Column(String(100), nullable=False, index=True)
    on_time_payment = Column(Boolean, default=True, nullable=False)
    
    # Metadata
    description = Column(Text, nullable=True)
    earned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="rewards")
    bill = relationship("Bill", back_populates="reward")
    
    __table_args__ = (
        Index('idx_rewards_user_earned', 'user_id', 'earned_at'),
        Index('idx_rewards_user_category', 'user_id', 'category'),
        Index('idx_rewards_points', 'points'),
    )
    
    def __repr__(self):
        return f"<Reward(id={self.id}, user_id={self.user_id}, points={self.points})>"
    
    @property
    def tier(self):
        """Determine tier based on points"""
        if self.points >= 10000:
            return RewardTier.DIAMOND
        elif self.points >= 5000:
            return RewardTier.PLATINUM
        elif self.points >= 2000:
            return RewardTier.GOLD
        elif self.points >= 500:
            return RewardTier.SILVER
        else:
            return RewardTier.BRONZE
    
    def to_dict(self):
        """Convert reward to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "bill_id": self.bill_id,
            "points": self.points,
            "bill_amount": float(self.bill_amount) if self.bill_amount else None,
            "category": self.category,
            "on_time_payment": self.on_time_payment,
            "description": self.description,
            "earned_at": self.earned_at.isoformat() if self.earned_at else None,
            "tier": self.tier.value if self.tier else None
        }