from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import math
import logging

from app.schemas.reward import RewardTier
from app.core.config import settings

logger = logging.getLogger(__name__)

class RewardService:
    def __init__(self):
        # Define reward tiers with point thresholds
        self.tiers = {
            RewardTier.BRONZE: {
                "min_points": 0,
                "max_points": 499,
                "multiplier": 1.0,
                "benefits": ["Basic tracking", "Email support"],
                "color": "#cd7f32"  # Bronze color
            },
            RewardTier.SILVER: {
                "min_points": 500,
                "max_points": 1999,
                "multiplier": 1.1,
                "benefits": ["Priority support", "Advanced analytics", "Custom categories"],
                "color": "#c0c0c0"  # Silver color
            },
            RewardTier.GOLD: {
                "min_points": 2000,
                "max_points": 4999,
                "multiplier": 1.25,
                "benefits": ["All Silver benefits", "Early access to features", "Dedicated account manager"],
                "color": "#ffd700"  # Gold color
            },
            RewardTier.PLATINUM: {
                "min_points": 5000,
                "max_points": 9999,
                "multiplier": 1.5,
                "benefits": ["All Gold benefits", "Custom integrations", "API access", "White-label reports"],
                "color": "#e5e4e2"  # Platinum color
            },
            RewardTier.DIAMOND: {
                "min_points": 10000,
                "max_points": None,  # No upper limit
                "multiplier": 2.0,
                "benefits": ["All Platinum benefits", "24/7 phone support", "Custom development", "Enterprise features"],
                "color": "#b9f2ff"  # Diamond color
            }
        }
        
        # Define category multipliers
        self.category_multipliers = {
            "utilities": 1.0,
            "rent": 1.2,
            "mortgage": 1.2,
            "credit_card": 1.5,
            "loan": 1.3,
            "insurance": 1.1,
            "subscription": 0.8,
            "education": 1.4,
            "medical": 1.0,
            "tax": 1.0,
            "other": 1.0
        }
        
        # Base points per dollar
        self.base_points_per_dollar = 10
        
        # On-time payment bonus multiplier
        self.on_time_multiplier = 1.5
        
        # Streak bonus (consecutive on-time payments)
        self.streak_bonus = {
            3: 1.1,   # 10% bonus for 3+ streak
            7: 1.2,   # 20% bonus for 7+ streak
            15: 1.3,  # 30% bonus for 15+ streak
            30: 1.5   # 50% bonus for 30+ streak
        }
    
    def calculate_points(
        self, 
        bill_amount: Decimal, 
        on_time_payment: bool = True, 
        category: str = "other",
        streak_days: int = 0
    ) -> int:
        """
        Calculate reward points for a bill payment
        
        Args:
            bill_amount: Bill amount in USD
            on_time_payment: Whether payment was made on time
            category: Bill category
            streak_days: Consecutive days of on-time payments
        
        Returns:
            Calculated points (integer)
        """
        try:
            # Convert Decimal to float for calculation
            amount = float(bill_amount)
            
            # Base points based on amount
            base_points = amount * self.base_points_per_dollar
            
            # Apply category multiplier
            category_multiplier = self.category_multipliers.get(category.lower(), 1.0)
            points = base_points * category_multiplier
            
            # Apply on-time payment bonus
            if on_time_payment:
                points *= self.on_time_multiplier
            
            # Apply streak bonus if applicable
            streak_multiplier = 1.0
            for streak, multiplier in sorted(self.streak_bonus.items(), reverse=True):
                if streak_days >= streak:
                    streak_multiplier = multiplier
                    break
            
            points *= streak_multiplier
            
            # Round to nearest integer
            points = round(points)
            
            logger.debug(
                f"Calculated points: amount=${amount}, "
                f"category={category}({category_multiplier}x), "
                f"on_time={on_time_payment}({self.on_time_multiplier if on_time_payment else 1.0}x), "
                f"streak={streak_days} days({streak_multiplier}x), "
                f"total_points={points}"
            )
            
            return max(1, points)  # Minimum 1 point
            
        except Exception as e:
            logger.error(f"Error calculating points: {str(e)}")
            # Fallback calculation
            return max(1, round(float(bill_amount) * self.base_points_per_dollar))
    
    def get_current_tier(self, total_points: int) -> RewardTier:
        """Get current tier based on total points"""
        for tier_name, tier_info in self.tiers.items():
            if tier_info["max_points"] is None:
                if total_points >= tier_info["min_points"]:
                    return tier_name
            elif tier_info["min_points"] <= total_points <= tier_info["max_points"]:
                return tier_name
        
        # Fallback to Bronze
        return RewardTier.BRONZE
    
    def get_next_tier(self, total_points: int) -> Optional[RewardTier]:
        """Get the next tier to achieve"""
        current_tier = self.get_current_tier(total_points)
        tier_names = list(self.tiers.keys())
        
        try:
            current_index = tier_names.index(current_tier)
            if current_index < len(tier_names) - 1:
                return tier_names[current_index + 1]
        except ValueError:
            pass
        
        return None
    
    def get_points_to_next_tier(self, total_points: int) -> Optional[int]:
        """Get points needed to reach next tier"""
        next_tier = self.get_next_tier(total_points)
        if not next_tier:
            return None
        
        next_tier_min = self.tiers[next_tier]["min_points"]
        return max(0, next_tier_min - total_points)
    
    def get_tier_progress(self, total_points: int) -> Dict:
        """Get tier progress information"""
        current_tier = self.get_current_tier(total_points)
        current_tier_info = self.tiers[current_tier]
        next_tier = self.get_next_tier(total_points)
        
        if next_tier:
            next_tier_info = self.tiers[next_tier]
            tier_range = current_tier_info["max_points"] - current_tier_info["min_points"]
            points_in_tier = total_points - current_tier_info["min_points"]
            progress_percentage = min(100, (points_in_tier / tier_range) * 100) if tier_range > 0 else 100
        else:
            progress_percentage = 100
        
        return {
            "current_tier": current_tier,
            "current_tier_info": current_tier_info,
            "next_tier": next_tier,
            "next_tier_info": self.tiers[next_tier] if next_tier else None,
            "points_in_current_tier": total_points - current_tier_info["min_points"],
            "progress_percentage": progress_percentage,
            "multiplier": current_tier_info["multiplier"]
        }
    
    def get_all_tiers(self) -> List[Dict]:
        """Get information about all tiers"""
        tiers_list = []
        for tier_name, tier_info in self.tiers.items():
            tiers_list.append({
                "tier": tier_name,
                "min_points": tier_info["min_points"],
                "max_points": tier_info["max_points"],
                "multiplier": tier_info["multiplier"],
                "benefits": tier_info["benefits"],
                "color": tier_info["color"]
            })
        
        return tiers_list
    
    def calculate_monthly_goal(self, user_id: int, historical_data: List[Dict]) -> Dict:
        """Calculate monthly point goal based on historical data"""
        if not historical_data:
            return {
                "goal_points": 1000,
                "confidence": "low",
                "reason": "No historical data available"
            }
        
        try:
            # Calculate average monthly points
            total_points = sum(data.get("points", 0) for data in historical_data)
            avg_monthly_points = total_points / len(historical_data)
            
            # Calculate standard deviation
            deviations = [(data.get("points", 0) - avg_monthly_points) ** 2 for data in historical_data]
            std_dev = math.sqrt(sum(deviations) / len(deviations))
            
            # Set goal based on average + one standard deviation
            goal_points = avg_monthly_points + std_dev
            
            # Apply reasonable bounds
            goal_points = max(100, min(goal_points, 10000))
            
            # Determine confidence level
            if len(historical_data) >= 6:
                confidence = "high"
            elif len(historical_data) >= 3:
                confidence = "medium"
            else:
                confidence = "low"
            
            return {
                "goal_points": round(goal_points),
                "confidence": confidence,
                "historical_months": len(historical_data),
                "average_monthly_points": round(avg_monthly_points),
                "std_deviation": round(std_dev)
            }
            
        except Exception as e:
            logger.error(f"Error calculating monthly goal: {str(e)}")
            return {
                "goal_points": 1000,
                "confidence": "low",
                "reason": f"Calculation error: {str(e)}"
            }
    
    def get_reward_breakdown(
        self, 
        bill_amount: Decimal, 
        on_time_payment: bool, 
        category: str, 
        streak_days: int = 0
    ) -> Dict:
        """Get detailed breakdown of point calculation"""
        amount = float(bill_amount)
        
        breakdown = {
            "bill_amount": amount,
            "category": category,
            "on_time_payment": on_time_payment,
            "streak_days": streak_days,
            "base_points_per_dollar": self.base_points_per_dollar,
            "components": {}
        }
        
        # Base points
        base_points = amount * self.base_points_per_dollar
        breakdown["components"]["base_points"] = {
            "value": round(base_points),
            "calculation": f"${amount} × {self.base_points_per_dollar} points/$"
        }
        
        # Category multiplier
        category_multiplier = self.category_multipliers.get(category.lower(), 1.0)
        breakdown["components"]["category_multiplier"] = {
            "value": category_multiplier,
            "applied_points": round(base_points * category_multiplier)
        }
        
        # On-time multiplier
        on_time_points = base_points * category_multiplier
        if on_time_payment:
            breakdown["components"]["on_time_bonus"] = {
                "value": self.on_time_multiplier,
                "applied_points": round(on_time_points * self.on_time_multiplier)
            }
            on_time_points *= self.on_time_multiplier
        
        # Streak multiplier
        streak_multiplier = 1.0
        for streak, multiplier in sorted(self.streak_bonus.items(), reverse=True):
            if streak_days >= streak:
                streak_multiplier = multiplier
                breakdown["components"]["streak_bonus"] = {
                    "streak_days": streak_days,
                    "multiplier": streak_multiplier,
                    "applied_points": round(on_time_points * streak_multiplier)
                }
                break
        
        # Final calculation
        final_points = round(base_points * category_multiplier)
        if on_time_payment:
            final_points *= self.on_time_multiplier
        final_points *= streak_multiplier
        final_points = round(final_points)
        
        breakdown["total_points"] = max(1, final_points)
        breakdown["calculation_steps"] = [
            f"Base: ${amount} × {self.base_points_per_dollar} = {round(base_points)} points",
            f"Category ({category}): × {category_multiplier} = {round(base_points * category_multiplier)} points"
        ]
        
        if on_time_payment:
            breakdown["calculation_steps"].append(
                f"On-time bonus: × {self.on_time_multiplier} = {round(base_points * category_multiplier * self.on_time_multiplier)} points"
            )
        
        if streak_multiplier > 1.0:
            breakdown["calculation_steps"].append(
                f"Streak bonus ({streak_days} days): × {streak_multiplier} = {breakdown['total_points']} points"
            )
        
        return breakdown
    
    def predict_future_tier(
        self, 
        current_points: int, 
        monthly_point_rate: float, 
        months_ahead: int = 12
    ) -> List[Dict]:
        """Predict future tier progression"""
        predictions = []
        
        for month in range(1, months_ahead + 1):
            projected_points = current_points + (monthly_point_rate * month)
            projected_tier = self.get_current_tier(int(projected_points))
            tier_progress = self.get_tier_progress(int(projected_points))
            
            predictions.append({
                "month": month,
                "projected_points": round(projected_points),
                "projected_tier": projected_tier,
                "tier_progress": tier_progress["progress_percentage"],
                "multiplier": tier_progress["multiplier"]
            })
        
        return predictions

# Global instance
reward_service = RewardService()