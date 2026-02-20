from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, extract, desc, asc, case
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.models.reward import Reward, RewardTier
from app.models.user import User
from app.schemas.reward import RewardCreate, RewardUpdate

class CRUDReward:
    def __init__(self, model):
        self.model = model
    
    def get(self, db: Session, id: int) -> Optional[Reward]:
        """Get a reward by ID"""
        return db.query(self.model).filter(self.model.id == id).first()
    
    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict] = None
    ) -> List[Reward]:
        """Get multiple rewards with optional filtering"""
        query = db.query(self.model)
        
        if filters:
            # Apply user_id filter if present
            if 'user_id' in filters:
                query = query.filter(self.model.user_id == filters['user_id'])
            
            # Apply date range filter
            if 'date_range' in filters and filters['date_range']:
                start_date, end_date = filters['date_range']
                query = query.filter(
                    self.model.earned_at >= start_date,
                    self.model.earned_at <= end_date
                )
            
            # Apply category filter
            if 'category' in filters and filters['category']:
                query = query.filter(self.model.category == filters['category'])
            
            # Apply on_time_payment filter
            if 'on_time_payment' in filters and filters['on_time_payment'] is not None:
                query = query.filter(self.model.on_time_payment == filters['on_time_payment'])
        
        # Order by earned date (descending for most recent first)
        query = query.order_by(desc(self.model.earned_at))
        
        return query.offset(skip).limit(limit).all()
    
    def create(self, db: Session, obj_in: Dict[str, Any]) -> Reward:
        """Create a new reward"""
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, db_obj: Reward, obj_in: Dict[str, Any]) -> Reward:
        """Update a reward"""
        update_data = obj_in.copy()
        
        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def remove(self, db: Session, id: int) -> Reward:
        """Delete a reward"""
        obj = db.query(self.model).get(id)
        db.delete(obj)
        db.commit()
        return obj
    
    def get_total_points(self, db: Session, user_id: int) -> int:
        """Get total points for a user"""
        result = db.query(func.sum(self.model.points)).filter(
            self.model.user_id == user_id
        ).scalar()
        
        return result or 0
    
    def get_recent_rewards(self, db: Session, user_id: int, limit: int = 10) -> List[Reward]:
        """Get recent rewards for a user"""
        return db.query(self.model).filter(
            self.model.user_id == user_id
        ).order_by(
            desc(self.model.earned_at)
        ).limit(limit).all()
    
    def get_monthly_breakdown(self, db: Session, user_id: int) -> List[Dict[str, Any]]:
        """Get monthly reward breakdown"""
        # Get last 6 months
        six_months_ago = datetime.now() - timedelta(days=180)
        
        # Query monthly data
        monthly_data = db.query(
            func.date_trunc('month', self.model.earned_at).label('month'),
            func.sum(self.model.points).label('total_points'),
            func.count(self.model.id).label('reward_count')
        ).filter(
            self.model.user_id == user_id,
            self.model.earned_at >= six_months_ago
        ).group_by(
            func.date_trunc('month', self.model.earned_at)
        ).order_by(
            desc(func.date_trunc('month', self.model.earned_at))
        ).all()
        
        # Get category breakdown for each month
        result = []
        for row in monthly_data:
            month_str = row.month.strftime('%Y-%m')
            
            # Get categories for this month
            categories_data = db.query(
                self.model.category,
                func.sum(self.model.points).label('category_points')
            ).filter(
                self.model.user_id == user_id,
                func.date_trunc('month', self.model.earned_at) == row.month
            ).group_by(self.model.category).all()
            
            categories = {row.category: row.category_points for row in categories_data}
            
            result.append({
                'month': month_str,
                'total_points': row.total_points or 0,
                'reward_count': row.reward_count or 0,
                'categories': categories
            })
        
        return result
    
    def get_leaderboard(self, db: Session, period: str = "monthly", limit: int = 10) -> List[Dict[str, Any]]:
        """Get reward points leaderboard"""
        # Define date range based on period
        today = datetime.now().date()
        
        if period == "daily":
            start_date = today
            end_date = today + timedelta(days=1)
        elif period == "weekly":
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=7)
        elif period == "monthly":
            start_date = date(today.year, today.month, 1)
            if today.month == 12:
                end_date = date(today.year + 1, 1, 1)
            else:
                end_date = date(today.year, today.month + 1, 1)
        else:  # yearly
            start_date = date(today.year, 1, 1)
            end_date = date(today.year + 1, 1, 1)
        
        # Query leaderboard
        leaderboard_query = db.query(
            User.id,
            User.username,
            User.email,
            func.sum(Reward.points).label('total_points'),
            func.count(Reward.id).label('reward_count')
        ).join(
            Reward, User.id == Reward.user_id
        ).filter(
            Reward.earned_at >= start_date,
            Reward.earned_at < end_date
        ).group_by(
            User.id, User.username, User.email
        ).order_by(
            desc('total_points'),
            desc('reward_count')
        ).limit(limit)
        
        # Execute query
        results = leaderboard_query.all()
        
        # Format results with tiers
        leaderboard = []
        for rank, row in enumerate(results, 1):
            # Determine tier based on total points
            if row.total_points >= 10000:
                tier = RewardTier.DIAMOND
            elif row.total_points >= 5000:
                tier = RewardTier.PLATINUM
            elif row.total_points >= 2000:
                tier = RewardTier.GOLD
            elif row.total_points >= 500:
                tier = RewardTier.SILVER
            else:
                tier = RewardTier.BRONZE
            
            leaderboard.append({
                'user_id': row.id,
                'username': row.username,
                'email': row.email,
                'total_points': row.total_points or 0,
                'reward_count': row.reward_count or 0,
                'current_tier': tier,
                'rank': rank
            })
        
        return leaderboard
    
    def get_user_reward_stats(self, db: Session, user_id: int) -> Dict[str, Any]:
        """Get comprehensive reward statistics for a user"""
        # Get total points and rewards
        total_stats = db.query(
            func.sum(self.model.points).label('total_points'),
            func.count(self.model.id).label('total_rewards'),
            func.avg(self.model.points).label('avg_points'),
            func.sum(case((self.model.on_time_payment == True, 1), else_=0)).label('on_time_count'),
            func.max(self.model.earned_at).label('last_reward_date')
        ).filter(
            self.model.user_id == user_id
        ).first()
        
        # Get category breakdown
        category_stats = db.query(
            self.model.category,
            func.sum(self.model.points).label('category_points'),
            func.count(self.model.id).label('category_count')
        ).filter(
            self.model.user_id == user_id
        ).group_by(self.model.category).all()
        
        # Get streak (consecutive days with rewards)
        streak_query = db.query(
            func.date(self.model.earned_at).label('reward_date')
        ).filter(
            self.model.user_id == user_id
        ).distinct().order_by(
            desc(func.date(self.model.earned_at))
        ).all()
        
        # Calculate streak
        streak = 0
        current_date = datetime.now().date()
        
        for i, row in enumerate(streak_query):
            reward_date = row.reward_date
            if i == 0:
                if reward_date == current_date or reward_date == current_date - timedelta(days=1):
                    streak = 1
                    prev_date = reward_date
                else:
                    break
            else:
                if reward_date == prev_date - timedelta(days=1):
                    streak += 1
                    prev_date = reward_date
                else:
                    break
        
        # Calculate on-time payment rate
        on_time_rate = 0
        if total_stats.total_rewards and total_stats.total_rewards > 0:
            on_time_rate = (total_stats.on_time_count / total_stats.total_rewards) * 100
        
        return {
            'total_points': total_stats.total_points or 0,
            'total_rewards': total_stats.total_rewards or 0,
            'avg_points_per_reward': float(total_stats.avg_points or 0),
            'on_time_payment_rate': round(on_time_rate, 2),
            'streak_days': streak,
            'last_reward_date': total_stats.last_reward_date,
            'category_breakdown': [
                {
                    'category': row.category,
                    'points': row.category_points or 0,
                    'count': row.category_count or 0
                }
                for row in category_stats
            ]
        }
    
    def get_top_categories(self, db: Session, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """Get top reward categories for a user"""
        results = db.query(
            self.model.category,
            func.sum(self.model.points).label('total_points'),
            func.count(self.model.id).label('reward_count'),
            func.avg(self.model.points).label('avg_points')
        ).filter(
            self.model.user_id == user_id
        ).group_by(self.model.category).order_by(
            desc(func.sum(self.model.points))
        ).limit(limit).all()
        
        return [
            {
                'category': row.category,
                'total_points': row.total_points or 0,
                'reward_count': row.reward_count or 0,
                'avg_points': float(row.avg_points or 0)
            }
            for row in results
        ]

reward_crud = CRUDReward(Reward)