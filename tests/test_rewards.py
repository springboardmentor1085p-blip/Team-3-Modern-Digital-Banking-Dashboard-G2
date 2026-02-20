import pytest
from datetime import datetime, date, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import Base, get_db
from app.models.reward import Reward, RewardTier
from app.models.bill import Bill, CurrencyCode
from app.models.user import User
from app.schemas.reward import RewardCreate
from app.crud.reward import reward_crud
from app.services.reward_service import RewardService
from app.core.auth import create_access_token, get_password_hash
from app.tests.conftest import TestingSessionLocal, override_get_db

client = TestClient(app)

# Test data
TEST_USER_DATA = {
    "username": "rewarduser",
    "email": "reward@example.com",
    "password": "rewardpass123",
    "full_name": "Reward Test User"
}

TEST_REWARD_DATA = {
    "bill_amount": Decimal("150.00"),
    "category": "utilities",
    "on_time_payment": True,
    "description": "Test reward for bill payment"
}

@pytest.fixture
def test_user(db: Session):
    """Create a test user for rewards"""
    user = User(
        username=TEST_USER_DATA["username"],
        email=TEST_USER_DATA["email"],
        hashed_password=get_password_hash(TEST_USER_DATA["password"]),
        full_name=TEST_USER_DATA["full_name"],
        is_active=True,
        points=500  # Start with some points
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers"""
    access_token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture
def test_bill(db: Session, test_user):
    """Create a test bill for rewards"""
    bill = Bill(
        name="Test Bill",
        amount=Decimal("150.00"),
        currency=CurrencyCode.USD,
        amount_usd=Decimal("150.00"),
        due_date=date.today() + timedelta(days=10),
        category="utilities",
        user_id=test_user.id
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill

@pytest.fixture
def test_reward(db: Session, test_user, test_bill):
    """Create a test reward"""
    reward = Reward(
        user_id=test_user.id,
        bill_id=test_bill.id,
        points=150,
        bill_amount=Decimal("150.00"),
        category="utilities",
        on_time_payment=True,
        description="Test reward"
    )
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward

class TestRewardAPI:
    """Test cases for Reward API endpoints"""
    
    def test_create_reward(self, db: Session, test_user, auth_headers):
        """Test creating a new reward"""
        reward_data = TEST_REWARD_DATA.copy()
        reward_data["bill_amount"] = str(reward_data["bill_amount"])
        
        with patch('app.services.reward_service.RewardService.calculate_points') as mock_calculate:
            mock_calculate.return_value = 225  # Mock points calculation
            
            response = client.post(
                "/api/v1/rewards/",
                json=reward_data,
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = response.json()
            
            assert data["points"] == 225
            assert data["user_id"] == test_user.id
            assert data["category"] == reward_data["category"]
            assert data["on_time_payment"] == reward_data["on_time_payment"]
            
            # Verify reward was created in database
            reward = db.query(Reward).filter(Reward.id == data["id"]).first()
            assert reward is not None
            assert reward.points == 225
    
    def test_get_rewards(self, db: Session, test_user, auth_headers, test_reward):
        """Test retrieving rewards"""
        response = client.get(
            "/api/v1/rewards/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify test reward is in response
        reward_ids = [reward["id"] for reward in data]
        assert test_reward.id in reward_ids
    
    def test_get_rewards_with_filters(self, db: Session, test_user, auth_headers):
        """Test retrieving rewards with filters"""
        # Create rewards with different dates
        today = datetime.now().date()
        rewards = [
            Reward(
                user_id=test_user.id,
                points=100,
                bill_amount=Decimal("100.00"),
                category="utilities",
                on_time_payment=True,
                earned_at=datetime.combine(today - timedelta(days=i), datetime.min.time())
            )
            for i in range(5)
        ]
        
        for reward in rewards:
            db.add(reward)
        db.commit()
        
        # Filter by date range
        start_date = today - timedelta(days=3)
        end_date = today
        
        response = client.get(
            f"/api/v1/rewards/?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should get rewards from last 3 days
        assert len(data) == 3
        
        # Filter by category
        response = client.get(
            "/api/v1/rewards/?category=utilities",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert all(reward["category"] == "utilities" for reward in data)
    
    def test_get_reward_summary(self, db: Session, test_user, auth_headers, test_reward):
        """Test getting reward summary"""
        # Add more points to user
        test_user.points = 750
        db.commit()
        
        response = client.get(
            "/api/v1/rewards/summary",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_points"] == 750
        assert data["current_tier"] == "silver"  # 500-1999 points
        assert data["next_tier"] == "gold"
        assert data["points_to_next_tier"] == 1250  # 2000 - 750
        
        # Verify structure
        assert "recent_rewards" in data
        assert "monthly_breakdown" in data
        assert isinstance(data["recent_rewards"], list)
        assert isinstance(data["monthly_breakdown"], list)
    
    def test_get_leaderboard(self, db: Session, test_user, auth_headers):
        """Test getting reward leaderboard"""
        # Create additional users with rewards
        users = []
        for i in range(3):
            user = User(
                username=f"leaderuser{i}",
                email=f"leader{i}@example.com",
                hashed_password=get_password_hash("password123"),
                is_active=True,
                points=(i + 1) * 1000  # 1000, 2000, 3000 points
            )
            db.add(user)
            users.append(user)
            
            # Add rewards for each user
            reward = Reward(
                user_id=user.id,
                points=(i + 1) * 1000,
                bill_amount=Decimal("1000.00"),
                category="utilities",
                on_time_payment=True
            )
            db.add(reward)
        
        db.commit()
        
        response = client.get(
            "/api/v1/rewards/leaderboard?period=all&limit=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 10
        
        # Verify ranking (higher points first)
        if len(data) > 1:
            points = [user["total_points"] for user in data]
            assert points == sorted(points, reverse=True)
    
    def test_process_bill_payment_reward(self, db: Session, test_user, auth_headers, test_bill):
        """Test processing reward for bill payment"""
        with patch('app.services.reward_service.RewardService.calculate_points') as mock_calculate:
            mock_calculate.return_value = 225
            
            response = client.post(
                f"/api/v1/rewards/process-bill-payment/{test_bill.id}?on_time_payment=true",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["message"] == "Reward points awarded"
            assert data["points"] == 225
            assert "reward_id" in data
            assert "total_points" in data
            
            # Verify reward was created
            reward = db.query(Reward).filter(Reward.bill_id == test_bill.id).first()
            assert reward is not None
            assert reward.points == 225
            
            # Verify user points were updated
            db.refresh(test_user)
            assert test_user.points == 500 + 225  # Initial + new points
    
    def test_get_reward_tiers(self, db: Session, auth_headers):
        """Test getting all reward tiers"""
        response = client.get(
            "/api/v1/rewards/tiers",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 5  # Bronze, Silver, Gold, Platinum, Diamond
        
        # Verify tier structure
        tiers = [item["tier"] for item in data]
        assert "bronze" in tiers
        assert "silver" in tiers
        assert "gold" in tiers
        assert "platinum" in tiers
        assert "diamond" in tiers
        
        # Verify each tier has required fields
        for tier in data:
            assert "min_points" in tier
            assert "benefits" in tier
            assert "color" in tier
    
    def test_get_user_reward_history_admin(self, db: Session, test_user, test_reward):
        """Test getting user reward history (admin only)"""
        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("adminpass123"),
            is_active=True,
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        
        # Get admin token
        admin_token = create_access_token(data={"sub": admin_user.email})
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get(
            f"/api/v1/rewards/history/{test_user.id}",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["user_id"] == test_user.id
    
    def test_get_user_reward_history_non_admin(self, db: Session, test_user, auth_headers):
        """Test non-admin accessing user reward history"""
        response = client.get(
            f"/api/v1/rewards/history/{test_user.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 403

class TestRewardCRUD:
    """Test cases for Reward CRUD operations"""
    
    def test_create_reward(self, db: Session, test_user):
        """Test creating a reward via CRUD"""
        reward_data = TEST_REWARD_DATA.copy()
        reward_data["user_id"] = test_user.id
        reward_data["points"] = 150
        
        reward = reward_crud.create(
            db=db,
            obj_in=reward_data
        )
        
        assert reward.id is not None
        assert reward.user_id == test_user.id
        assert reward.points == 150
        assert reward.category == reward_data["category"]
    
    def test_get_reward(self, db: Session, test_reward):
        """Test getting a reward via CRUD"""
        reward = reward_crud.get(db=db, id=test_reward.id)
        
        assert reward is not None
        assert reward.id == test_reward.id
        assert reward.points == test_reward.points
    
    def test_get_multi_rewards(self, db: Session, test_user):
        """Test getting multiple rewards via CRUD"""
        # Create multiple rewards
        for i in range(5):
            reward = Reward(
                user_id=test_user.id,
                points=100 + i * 50,
                bill_amount=Decimal("100.00"),
                category=f"category_{i % 3}",
                on_time_payment=(i % 2 == 0)
            )
            db.add(reward)
        db.commit()
        
        rewards = reward_crud.get_multi(
            db=db,
            skip=0,
            limit=10,
            filters={"user_id": test_user.id}
        )
        
        assert len(rewards) >= 5
    
    def test_get_total_points(self, db: Session, test_user):
        """Test getting total points for a user"""
        # Create rewards with different points
        rewards = [
            Reward(
                user_id=test_user.id,
                points=points,
                bill_amount=Decimal("100.00"),
                category="utilities",
                on_time_payment=True
            )
            for points in [100, 200, 300]
        ]
        
        for reward in rewards:
            db.add(reward)
        db.commit()
        
        total_points = reward_crud.get_total_points(db=db, user_id=test_user.id)
        
        assert total_points == 600  # 100 + 200 + 300
    
    def test_get_recent_rewards(self, db: Session, test_user):
        """Test getting recent rewards for a user"""
        # Create rewards with different dates
        now = datetime.now()
        rewards = [
            Reward(
                user_id=test_user.id,
                points=100,
                bill_amount=Decimal("100.00"),
                category="utilities",
                on_time_payment=True,
                earned_at=now - timedelta(days=i)
            )
            for i in range(10)
        ]
        
        for reward in rewards:
            db.add(reward)
        db.commit()
        
        recent_rewards = reward_crud.get_recent_rewards(
            db=db,
            user_id=test_user.id,
            limit=5
        )
        
        assert len(recent_rewards) == 5
        
        # Verify they're ordered by most recent first
        dates = [reward.earned_at for reward in recent_rewards]
        assert dates == sorted(dates, reverse=True)
    
    def test_get_monthly_breakdown(self, db: Session, test_user):
        """Test getting monthly reward breakdown"""
        now = datetime.now()
        
        # Create rewards for different months
        rewards = []
        for i in range(6):  # Last 6 months
            month_date = now - timedelta(days=30 * i)
            for j in range(3):  # 3 rewards per month
                reward = Reward(
                    user_id=test_user.id,
                    points=100,
                    bill_amount=Decimal("100.00"),
                    category=f"category_{j}",
                    on_time_payment=True,
                    earned_at=month_date - timedelta(days=j)
                )
                rewards.append(reward)
                db.add(reward)
        
        db.commit()
        
        monthly_breakdown = reward_crud.get_monthly_breakdown(
            db=db,
            user_id=test_user.id
        )
        
        assert isinstance(monthly_breakdown, list)
        
        # Should have data for up to 6 months
        assert len(monthly_breakdown) <= 6
        
        for month_data in monthly_breakdown:
            assert "month" in month_data
            assert "total_points" in month_data
            assert "reward_count" in month_data
            assert "categories" in month_data
            assert isinstance(month_data["categories"], dict)
    
    def test_get_leaderboard_crud(self, db: Session):
        """Test getting leaderboard via CRUD"""
        # Create multiple users with rewards
        users = []
        for i in range(5):
            user = User(
                username=f"leaderuser{i}",
                email=f"leader{i}@example.com",
                hashed_password=get_password_hash("password123"),
                is_active=True
            )
            db.add(user)
            users.append(user)
            
            # Add rewards for each user
            for j in range(i + 1):  # User i gets i+1 rewards
                reward = Reward(
                    user_id=user.id,
                    points=100 * (j + 1),
                    bill_amount=Decimal("100.00"),
                    category="utilities",
                    on_time_payment=True
                )
                db.add(reward)
        
        db.commit()
        
        leaderboard = reward_crud.get_leaderboard(
            db=db,
            period="all",
            limit=5
        )
        
        assert isinstance(leaderboard, list)
        assert len(leaderboard) == 5
        
        # Verify ranking
        points = [entry["total_points"] for entry in leaderboard]
        assert points == sorted(points, reverse=True)
        
        # Verify each entry has required fields
        for entry in leaderboard:
            assert "user_id" in entry
            assert "username" in entry
            assert "total_points" in entry
            assert "current_tier" in entry
            assert "rank" in entry
    
    def test_get_user_reward_stats(self, db: Session, test_user):
        """Test getting user reward statistics"""
        # Create various rewards
        rewards = [
            Reward(
                user_id=test_user.id,
                points=100,
                bill_amount=Decimal("100.00"),
                category="utilities",
                on_time_payment=True
            ),
            Reward(
                user_id=test_user.id,
                points=150,
                bill_amount=Decimal("150.00"),
                category="rent",
                on_time_payment=True
            ),
            Reward(
                user_id=test_user.id,
                points=200,
                bill_amount=Decimal("200.00"),
                category="utilities",
                on_time_payment=False  # Late payment
            )
        ]
        
        for reward in rewards:
            db.add(reward)
        db.commit()
        
        stats = reward_crud.get_user_reward_stats(db=db, user_id=test_user.id)
        
        assert stats["total_points"] == 450  # 100 + 150 + 200
        assert stats["total_rewards"] == 3
        assert stats["avg_points_per_reward"] == 150.0  # 450 / 3
        assert stats["on_time_payment_rate"] == round((2 / 3) * 100, 2)  # 2 out of 3 on time
        assert "category_breakdown" in stats
        assert "streak_days" in stats
        assert "last_reward_date" in stats
        
        # Verify category breakdown
        categories = {item["category"] for item in stats["category_breakdown"]}
        assert "utilities" in categories
        assert "rent" in categories
    
    def test_get_top_categories(self, db: Session, test_user):
        """Test getting top categories for a user"""
        # Create rewards in different categories
        categories = {
            "utilities": 3,  # 3 rewards
            "rent": 2,       # 2 rewards
            "subscription": 1,  # 1 reward
            "other": 1       # 1 reward
        }
        
        for category, count in categories.items():
            for i in range(count):
                reward = Reward(
                    user_id=test_user.id,
                    points=100 * (i + 1),
                    bill_amount=Decimal("100.00"),
                    category=category,
                    on_time_payment=True
                )
                db.add(reward)
        
        db.commit()
        
        top_categories = reward_crud.get_top_categories(
            db=db,
            user_id=test_user.id,
            limit=3
        )
        
        assert len(top_categories) == 3
        
        # Should be ordered by total points
        points = [cat["total_points"] for cat in top_categories]
        assert points == sorted(points, reverse=True)
        
        # Verify structure
        for category in top_categories:
            assert "category" in category
            assert "total_points" in category
            assert "reward_count" in category
            assert "avg_points" in category

class TestRewardService:
    """Test cases for Reward Service"""
    
    def test_calculate_points(self):
        """Test points calculation"""
        service = RewardService()
        
        # Test basic calculation
        points = service.calculate_points(
            bill_amount=Decimal("100.00"),
            on_time_payment=True,
            category="utilities"
        )
        
        assert points > 0
        
        # Test with different categories
        points_rent = service.calculate_points(
            bill_amount=Decimal("100.00"),
            on_time_payment=True,
            category="rent"  # Higher multiplier
        )
        
        points_subscription = service.calculate_points(
            bill_amount=Decimal("100.00"),
            on_time_payment=True,
            category="subscription"  # Lower multiplier
        )
        
        # Rent should give more points than subscription
        assert points_rent > points_subscription
        
        # Test late payment
        points_late = service.calculate_points(
            bill_amount=Decimal("100.00"),
            on_time_payment=False,
            category="utilities"
        )
        
        points_on_time = service.calculate_points(
            bill_amount=Decimal("100.00"),
            on_time_payment=True,
            category="utilities"
        )
        
        # On-time payment should give more points
        assert points_on_time > points_late
    
    def test_get_current_tier(self):
        """Test determining current tier"""
        service = RewardService()
        
        test_cases = [
            (0, RewardTier.BRONZE),
            (250, RewardTier.BRONZE),
            (500, RewardTier.SILVER),
            (1500, RewardTier.SILVER),
            (2000, RewardTier.GOLD),
            (3500, RewardTier.GOLD),
            (5000, RewardTier.PLATINUM),
            (7500, RewardTier.PLATINUM),
            (10000, RewardTier.DIAMOND),
            (15000, RewardTier.DIAMOND),
        ]
        
        for points, expected_tier in test_cases:
            tier = service.get_current_tier(points)
            assert tier == expected_tier, f"Failed for {points} points"
    
    def test_get_next_tier(self):
        """Test determining next tier"""
        service = RewardService()
        
        test_cases = [
            (0, RewardTier.SILVER),
            (250, RewardTier.SILVER),
            (500, RewardTier.GOLD),
            (1500, RewardTier.GOLD),
            (2000, RewardTier.PLATINUM),
            (3500, RewardTier.PLATINUM),
            (5000, RewardTier.DIAMOND),
            (7500, RewardTier.DIAMOND),
            (10000, None),  # No next tier for diamond
            (15000, None),
        ]
        
        for points, expected_next in test_cases:
            next_tier = service.get_next_tier(points)
            assert next_tier == expected_next, f"Failed for {points} points"
    
    def test_get_points_to_next_tier(self):
        """Test calculating points to next tier"""
        service = RewardService()
        
        test_cases = [
            (0, 500),     # Bronze to Silver: 500 - 0 = 500
            (250, 250),   # Bronze to Silver: 500 - 250 = 250
            (500, 1500),  # Silver to Gold: 2000 - 500 = 1500
            (1000, 1000), # Silver to Gold: 2000 - 1000 = 1000
            (2000, 3000), # Gold to Platinum: 5000 - 2000 = 3000
            (5000, 5000), # Platinum to Diamond: 10000 - 5000 = 5000
            (10000, None), # Diamond has no next tier
        ]
        
        for points, expected_points in test_cases:
            points_to_next = service.get_points_to_next_tier(points)
            assert points_to_next == expected_points, f"Failed for {points} points"
    
    def test_get_tier_progress(self):
        """Test getting tier progress information"""
        service = RewardService()
        
        # Test in middle of silver tier
        progress = service.get_tier_progress(1000)  # Silver: 500-1999
        
        assert progress["current_tier"] == RewardTier.SILVER
        assert progress["points_in_current_tier"] == 500  # 1000 - 500
        # Should be about 33% through silver tier (500/1500)
        assert 30 <= progress["progress_percentage"] <= 35
        assert progress["next_tier"] == RewardTier.GOLD
        
        # Test at max tier (diamond)
        progress = service.get_tier_progress(15000)
        
        assert progress["current_tier"] == RewardTier.DIAMOND
        assert progress["progress_percentage"] == 100
        assert progress["next_tier"] is None
    
    def test_get_all_tiers(self):
        """Test getting all tier information"""
        service = RewardService()
        
        tiers = service.get_all_tiers()
        
        assert len(tiers) == 5
        
        # Verify all tiers are present
        tier_names = [tier["tier"] for tier in tiers]
        assert RewardTier.BRONZE in tier_names
        assert RewardTier.SILVER in tier_names
        assert RewardTier.GOLD in tier_names
        assert RewardTier.PLATINUM in tier_names
        assert RewardTier.DIAMOND in tier_names
        
        # Verify each tier has required fields
        for tier in tiers:
            assert "min_points" in tier
            assert "max_points" in tier
            assert "multiplier" in tier
            assert "benefits" in tier
            assert "color" in tier
    
    def test_get_reward_breakdown(self):
        """Test getting detailed reward breakdown"""
        service = RewardService()
        
        breakdown = service.get_reward_breakdown(
            bill_amount=Decimal("100.00"),
            on_time_payment=True,
            category="rent",
            streak_days=10
        )
        
        assert breakdown["bill_amount"] == 100.0
        assert breakdown["category"] == "rent"
        assert breakdown["on_time_payment"] == True
        assert breakdown["streak_days"] == 10
        
        assert "components" in breakdown
        assert "total_points" in breakdown
        assert breakdown["total_points"] > 0
        
        # Verify calculation steps
        assert "calculation_steps" in breakdown
        assert isinstance(breakdown["calculation_steps"], list)
        assert len(breakdown["calculation_steps"]) > 0
    
    def test_predict_future_tier(self):
        """Test predicting future tier progression"""
        service = RewardService()
        
        predictions = service.predict_future_tier(
            current_points=1000,
            monthly_point_rate=500,
            months_ahead=12
        )
        
        assert len(predictions) == 12
        
        # Verify structure
        for prediction in predictions:
            assert "month" in prediction
            assert "projected_points" in prediction
            assert "projected_tier" in prediction
            assert "tier_progress" in prediction
            assert "multiplier" in prediction
        
        # Points should increase each month
        points = [p["projected_points"] for p in predictions]
        assert points == sorted(points)

class TestRewardModels:
    """Test cases for Reward model properties"""
    
    def test_reward_tier_property(self, test_reward):
        """Test reward tier property"""
        # Test with different point values
        test_cases = [
            (100, RewardTier.BRONZE),
            (500, RewardTier.SILVER),
            (2000, RewardTier.GOLD),
            (5000, RewardTier.PLATINUM),
            (10000, RewardTier.DIAMOND),
        ]
        
        for points, expected_tier in test_cases:
            test_reward.points = points
            assert test_reward.tier == expected_tier
    
    def test_reward_to_dict(self, test_reward):
        """Test reward to_dict method"""
        reward_dict = test_reward.to_dict()
        
        assert isinstance(reward_dict, dict)
        assert reward_dict["id"] == test_reward.id
        assert reward_dict["user_id"] == test_reward.user_id
        assert reward_dict["points"] == test_reward.points
        assert reward_dict["category"] == test_reward.category
        assert "tier" in reward_dict
        assert reward_dict["tier"] == test_reward.tier.value
    
    def test_reward_relationships(self, db: Session, test_reward, test_user, test_bill):
        """Test reward relationships"""
        # Refresh to load relationships
        db.refresh(test_reward)
        
        # Test user relationship
        assert test_reward.user is not None
        assert test_reward.user.id == test_user.id
        
        # Test bill relationship
        assert test_reward.bill is not None
        assert test_reward.bill.id == test_bill.id

if __name__ == "__main__":
    pytest.main([__file__, "-v"])