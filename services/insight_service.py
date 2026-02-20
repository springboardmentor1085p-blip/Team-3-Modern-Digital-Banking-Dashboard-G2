"""
Service for generating financial insights and analytics
"""
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict
import statistics
import math
from sqlalchemy.orm import Session
from sqlalchemy import Integer, String, func, and_, or_, extract, case, Float
from sqlalchemy.sql import label

from app.models.transaction import Transaction, TransactionType
from app.models.account import Account
from app.models.budget import Budget
from app.schemas.insight import (
    CashFlowInsightResponse,
    CategoryInsightResponse,
    TrendInsightResponse,
    MonthlySummaryResponse,
    InsightCategory,
    TimePeriod
)

class InsightService:
    """Service for generating financial insights"""
    
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
    
    def get_cash_flow_insights(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> CashFlowInsightResponse:
        """Get comprehensive cash flow insights for a date range"""
        # Get all transactions in date range
        transactions = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).all()
        
        # Calculate totals
        total_income = sum(
            t.amount for t in transactions 
            if t.transaction_type == TransactionType.CREDIT
        )
        total_expenses = sum(
            abs(t.amount) for t in transactions 
            if t.transaction_type == TransactionType.DEBIT
        )
        
        # Calculate net cash flow
        net_cash_flow = total_income - total_expenses
        
        # Calculate averages
        days_in_period = (end_date - start_date).days or 1
        avg_daily_income = total_income / days_in_period
        avg_daily_expenses = total_expenses / days_in_period
        
        # Find largest transactions
        income_transactions = [
            t for t in transactions 
            if t.transaction_type == TransactionType.CREDIT
        ]
        expense_transactions = [
            t for t in transactions 
            if t.transaction_type == TransactionType.DEBIT
        ]
        
        largest_income = max(
            [t.amount for t in income_transactions], 
            default=0
        )
        largest_expense = max(
            [abs(t.amount) for t in expense_transactions], 
            default=0
        )
        
        # Find most frequent category
        category_counts = defaultdict(int)
        for t in expense_transactions:
            category_counts[t.category] += 1
        
        most_frequent_category = max(
            category_counts.items(), 
            key=lambda x: x[1], 
            default=(None, 0)
        )[0]
        
        # Determine cash flow trend
        prev_period_start = start_date - (end_date - start_date)
        prev_period_end = start_date - timedelta(days=1)
        
        prev_cash_flow = self._get_net_cash_flow(
            prev_period_start, prev_period_end
        )
        
        if prev_cash_flow is None:
            cash_flow_trend = "stable"
        elif net_cash_flow > prev_cash_flow * 1.1:
            cash_flow_trend = "increasing"
        elif net_cash_flow < prev_cash_flow * 0.9:
            cash_flow_trend = "decreasing"
        else:
            cash_flow_trend = "stable"
        
        # Calculate savings rate
        savings_rate = 0
        if total_income > 0:
            savings_rate = (net_cash_flow / total_income) * 100
        
        # Calculate growth rates
        month_over_month_growth = None
        year_over_year_growth = None
        
        if prev_cash_flow is not None and prev_cash_flow != 0:
            month_over_month_growth = (
                (net_cash_flow - prev_cash_flow) / abs(prev_cash_flow)
            ) * 100
        
        # Same period last year
        last_year_start = start_date - timedelta(days=365)
        last_year_end = end_date - timedelta(days=365)
        last_year_cash_flow = self._get_net_cash_flow(
            last_year_start, last_year_end
        )
        
        if last_year_cash_flow is not None and last_year_cash_flow != 0:
            year_over_year_growth = (
                (net_cash_flow - last_year_cash_flow) / abs(last_year_cash_flow)
            ) * 100
        
        return CashFlowInsightResponse(
            period_start=start_date,
            period_end=end_date,
            total_income=total_income,
            total_expenses=total_expenses,
            net_cash_flow=net_cash_flow,
            avg_daily_income=avg_daily_income,
            avg_daily_expenses=avg_daily_expenses,
            largest_income=largest_income if income_transactions else None,
            largest_expense=largest_expense if expense_transactions else None,
            income_transaction_count=len(income_transactions),
            expense_transaction_count=len(expense_transactions),
            most_frequent_category=most_frequent_category,
            cash_flow_trend=cash_flow_trend,
            savings_rate=savings_rate,
            month_over_month_growth=month_over_month_growth,
            year_over_year_growth=year_over_year_growth
        )
    
    def get_category_breakdown(
        self,
        start_date: datetime,
        end_date: datetime,
        insight_type: str = "expense",
        limit: int = 10
    ) -> List[CategoryInsightResponse]:
        """Get breakdown of transactions by category"""
        # Build query based on insight type
        query = self.db.query(
            Transaction.category,
            func.sum(Transaction.amount).label('total_amount'),
            func.count(Transaction.id).label('transaction_count'),
            func.avg(Transaction.amount).label('avg_amount')
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        )
        
        if insight_type == "income":
            query = query.filter(Transaction.transaction_type == TransactionType.CREDIT)
        elif insight_type == "expense":
            query = query.filter(Transaction.transaction_type == TransactionType.DEBIT)
            # For expenses, we want positive numbers
            query = query.with_entities(
                Transaction.category,
                func.sum(func.abs(Transaction.amount)).label('total_amount'),
                func.count(Transaction.id).label('transaction_count'),
                func.avg(func.abs(Transaction.amount)).label('avg_amount')
            )
        
        results = query.group_by(Transaction.category)\
            .order_by(func.sum(func.abs(Transaction.amount)).desc())\
            .limit(limit)\
            .all()
        
        # Calculate total for percentages
        total_amount = sum(abs(r.total_amount) for r in results)
        
        # Get previous period for trend analysis
        prev_start = start_date - (end_date - start_date)
        prev_end = start_date - timedelta(days=1)
        
        prev_totals = self._get_category_totals(
            prev_start, prev_end, insight_type
        )
        
        insights = []
        for category, amount, count, avg_amount in results:
            percentage = (abs(amount) / total_amount * 100) if total_amount > 0 else 0
            
            # Calculate trend
            trend = None
            prev_amount = prev_totals.get(category, 0)
            change_percentage = None
            
            if prev_amount and prev_amount != 0:
                change = abs(amount) - prev_amount
                change_percentage = (change / prev_amount) * 100
                
                if change_percentage > 5:
                    trend = "up"
                elif change_percentage < -5:
                    trend = "down"
                else:
                    trend = "stable"
            
            insights.append(CategoryInsightResponse(
                category=category or "Uncategorized",
                amount=abs(amount),
                percentage=percentage,
                transaction_count=count,
                avg_transaction_amount=abs(avg_amount) if avg_amount else 0,
                trend=trend,
                prev_period_amount=prev_amount,
                change_percentage=change_percentage
            ))
        
        return insights
    
    def get_trend_insights(
        self, 
        metric: str, 
        period: str, 
        months: int
    ) -> List[TrendInsightResponse]:
        """Get trend data for a metric over time"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months * 30)
        
        # Determine date truncation based on period
        if period == "daily":
            date_format = "%Y-%m-%d"
            group_by = [
                func.date(Transaction.date),
                func.date(Transaction.date),
                func.date(Transaction.date)
            ]
        elif period == "weekly":
            date_format = "%Y-W%U"
            group_by = [
                func.strftime('%Y-W%W', Transaction.date),
                func.date(
                    func.date(Transaction.date, 'weekday 0', '-6 days')
                ),
                func.date(Transaction.date, 'weekday 0')
            ]
        elif period == "monthly":
            date_format = "%Y-%m"
            group_by = [
                func.strftime('%Y-%m', Transaction.date),
                func.date(
                    func.date(Transaction.date, 'start of month')
                ),
                func.date(
                    func.date(Transaction.date, 'start of month', '+1 month', '-1 day')
                )
            ]
        else:  # quarterly
            date_format = "%Y-Q"
            group_by = [
                func.strftime('%Y', Transaction.date) + '-Q' +
                func.cast(((func.strftime('%m', Transaction.date).cast(Integer) - 1) / 3 + 1), String),

                # quarter start
                func.date(
                    Transaction.date,
                    'start of month',
                    func.printf(
                        '%d months',
                        -((func.strftime('%m', Transaction.date).cast(Integer) - 1) % 3)
                    )
                ),

                # quarter end
                func.date(
                    Transaction.date,
                    'start of month',
                    func.printf(
                        '%d months',
                        3 - ((func.strftime('%m', Transaction.date).cast(Integer) - 1) % 3)
                    ),
                    '-1 day'
                )
            ]

        
        # Build query based on metric
        query = self.db.query(
            group_by[0].label('period'),
            group_by[1].label('period_start'),
            group_by[2].label('period_end'),
            func.sum(
                case(
                    [
                        (Transaction.transaction_type == TransactionType.CREDIT, 
                         Transaction.amount),
                        (Transaction.transaction_type == TransactionType.DEBIT,
                         -func.abs(Transaction.amount))
                    ],
                    else_=0
                )
            ).label('net_flow'),
            func.sum(
                case(
                    [(Transaction.transaction_type == TransactionType.CREDIT, 
                      Transaction.amount)],
                    else_=0
                )
            ).label('income'),
            func.sum(
                case(
                    [(Transaction.transaction_type == TransactionType.DEBIT,
                      func.abs(Transaction.amount))],
                    else_=0
                )
            ).label('expenses')
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).group_by('period', 'period_start', 'period_end')\
         .order_by('period_start')
        
        results = query.all()
        
        # Map results to response
        trends = []
        for i, row in enumerate(results):
            # Select value based on metric
            if metric == "income":
                value = row.income or 0
            elif metric == "expenses":
                value = row.expenses or 0
            else:  # net_flow
                value = row.net_flow or 0
            
            # Calculate growth from previous period
            prev_period_value = None
            growth_percentage = None
            
            if i > 0:
                prev_row = results[i - 1]
                if metric == "income":
                    prev_period_value = prev_row.income or 0
                elif metric == "expenses":
                    prev_period_value = prev_row.expenses or 0
                else:
                    prev_period_value = prev_row.net_flow or 0
                
                if prev_period_value != 0:
                    growth_percentage = (
                        (value - prev_period_value) / abs(prev_period_value)
                    ) * 100
            
            trends.append(TrendInsightResponse(
                period=row.period,
                period_start=row.period_start,
                period_end=row.period_end,
                value=value,
                prev_period_value=prev_period_value,
                growth_percentage=growth_percentage,
                is_estimated=False
            ))
        
        return trends
    
    def get_monthly_summary(
        self, 
        year: int, 
        months: int
    ) -> List[MonthlySummaryResponse]:
        """Get monthly financial summary"""
        summaries = []
        
        for i in range(months):
            # Calculate month
            month_offset = months - i - 1
            target_date = datetime(year, 1, 1) - timedelta(days=month_offset * 30)
            target_year = target_date.year
            target_month = target_date.month
            
            # Get month start and end
            month_start = datetime(target_year, target_month, 1)
            if target_month == 12:
                month_end = datetime(target_year, 12, 31)
            else:
                month_end = datetime(target_year, target_month + 1, 1) - timedelta(days=1)
            
            # Get transactions for month
            transactions = self.db.query(Transaction).filter(
                Transaction.user_id == self.user_id,
                Transaction.date >= month_start,
                Transaction.date <= month_end,
                Transaction.status == "completed"
            ).all()
            
            # Calculate totals
            total_income = sum(
                t.amount for t in transactions 
                if t.transaction_type == TransactionType.CREDIT
            )
            total_expenses = sum(
                abs(t.amount) for t in transactions 
                if t.transaction_type == TransactionType.DEBIT
            )
            net_cash_flow = total_income - total_expenses
            
            # Calculate savings rate
            savings_rate = 0
            if total_income > 0:
                savings_rate = (net_cash_flow / total_income) * 100
            
            # Find top category
            category_totals = defaultdict(float)
            for t in transactions:
                if t.transaction_type == TransactionType.DEBIT:
                    category_totals[t.category or "Uncategorized"] += abs(t.amount)
            
            top_category = max(
                category_totals.items(), 
                key=lambda x: x[1], 
                default=(None, 0)
            )[0]
            top_category_amount = category_totals.get(top_category, 0)
            
            # Calculate average daily spend
            days_in_month = (month_end - month_start).days + 1
            avg_daily_spend = total_expenses / days_in_month if days_in_month > 0 else 0
            
            month_names = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ]
            
            summaries.append(MonthlySummaryResponse(
                year=target_year,
                month=target_month,
                month_name=month_names[target_month - 1],
                total_income=total_income,
                total_expenses=total_expenses,
                net_cash_flow=net_cash_flow,
                savings_rate=savings_rate,
                top_category=top_category,
                top_category_amount=top_category_amount,
                transaction_count=len(transactions),
                avg_daily_spend=avg_daily_spend
            ))
        
        return summaries
    
    def detect_anomalies(self, threshold: float = 2.0) -> List[Dict[str, Any]]:
        """Detect anomalous transactions using statistical methods"""
        anomalies = []
        
        # Get recent expenses (last 90 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        expenses = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.transaction_type == TransactionType.DEBIT,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).all()
        
        if len(expenses) < 10:
            return anomalies
        
        # Group by category
        categories = set(t.category for t in expenses if t.category)
        
        for category in categories:
            category_expenses = [
                abs(t.amount) for t in expenses 
                if t.category == category
            ]
            
            if len(category_expenses) < 5:
                continue
            
            # Calculate mean and standard deviation
            mean = statistics.mean(category_expenses)
            if len(category_expenses) > 1:
                stdev = statistics.stdev(category_expenses)
            else:
                stdev = 0
            
            # Find anomalies (transactions > threshold * standard deviation from mean)
            for transaction in expenses:
                if transaction.category != category:
                    continue
                
                amount = abs(transaction.amount)
                if stdev > 0:
                    z_score = abs((amount - mean) / stdev)
                else:
                    z_score = 0
                
                if z_score > threshold:
                    # Determine reason
                    if amount > mean * 3:
                        reason = f"Extremely high transaction (3x above average for '{category}')"
                    elif amount > mean * 2:
                        reason = f"High transaction (2x above average for '{category}')"
                    else:
                        reason = f"Unusually large transaction for '{category}'"
                    
                    anomalies.append({
                        "transaction_id": transaction.id,
                        "date": transaction.date,
                        "amount": amount,
                        "category": category or "Uncategorized",
                        "description": transaction.description,
                        "deviation_score": z_score,
                        "reason": reason,
                        "suggested_action": "Review this transaction to ensure it's legitimate"
                    })
        
        # Sort by deviation score (most anomalous first)
        anomalies.sort(key=lambda x: x["deviation_score"], reverse=True)
        
        return anomalies[:20]  # Limit to top 20 anomalies
    
    def predict_cash_flow(self, horizon_days: int = 30) -> List[Dict[str, Any]]:
        """Predict future cash flow using simple time series analysis"""
        predictions = []
        
        # Get historical data (last 180 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)
        
        # Get daily net cash flow
        daily_flow = self._get_daily_cash_flow(start_date, end_date)
        
        if not daily_flow:
            return predictions
        
        # Simple prediction: average of same weekday
        for i in range(horizon_days):
            prediction_date = end_date + timedelta(days=i + 1)
            weekday = prediction_date.weekday()
            
            # Get historical values for same weekday
            same_weekday_values = [
                flow for date, flow in daily_flow.items()
                if date.weekday() == weekday
            ]
            
            if same_weekday_values:
                predicted = statistics.mean(same_weekday_values)
                # Add some randomness (simulating confidence interval)
                std_dev = statistics.stdev(same_weekday_values) if len(same_weekday_values) > 1 else 0
                
                predictions.append({
                    "date": prediction_date.date(),
                    "predicted_net_flow": predicted,
                    "confidence_interval_low": predicted - std_dev,
                    "confidence_interval_high": predicted + std_dev,
                    "is_weekend": weekday >= 5,
                    "is_holiday": False  # Would integrate with holiday calendar
                })
        
        return predictions
    
    def analyze_spending_habits(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Analyze spending habits and patterns"""
        habits = {
            "weekday_spending": self._analyze_weekday_spending(start_date, end_date),
            "time_of_day": self._analyze_time_of_day(start_date, end_date),
            "merchant_patterns": self._analyze_merchant_patterns(start_date, end_date),
            "category_patterns": self._analyze_category_patterns(start_date, end_date)
        }
        
        # Generate overall insights
        insights = []
        recommendations = []
        
        # Analyze weekday spending pattern
        weekday_pattern = habits["weekday_spending"]
        max_day = max(weekday_pattern.items(), key=lambda x: x[1])
        min_day = min(weekday_pattern.items(), key=lambda x: x[1])
        
        if max_day[1] > min_day[1] * 2:
            insights.append(f"You spend significantly more on {max_day[0]}s than on {min_day[0]}s")
            recommendations.append(f"Consider spreading larger purchases throughout the week")
        
        # Analyze time of day
        time_pattern = habits["time_of_day"]
        if time_pattern.get("afternoon", 0) > time_pattern.get("morning", 0) * 1.5:
            insights.append("Most of your spending occurs in the afternoon")
        
        # Calculate habit strength score
        strength_score = self._calculate_habit_strength(habits)
        
        return {
            "habits": habits,
            "insights": insights,
            "recommendations": recommendations,
            "strength_score": strength_score
        }
    
    # Helper methods
    def _get_net_cash_flow(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> Optional[float]:
        """Get net cash flow for a date range"""
        result = self.db.query(
            func.sum(
                case(
                    [
                        (Transaction.transaction_type == TransactionType.CREDIT, 
                         Transaction.amount),
                        (Transaction.transaction_type == TransactionType.DEBIT,
                         -func.abs(Transaction.amount))
                    ],
                    else_=0
                )
            )
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).scalar()
        
        return result or 0
    
    def _get_category_totals(
        self,
        start_date: datetime,
        end_date: datetime,
        insight_type: str
    ) -> Dict[str, float]:
        """Get category totals for a date range"""
        query = self.db.query(
            Transaction.category,
            func.sum(func.abs(Transaction.amount)).label('total')
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        )
        
        if insight_type == "income":
            query = query.filter(Transaction.transaction_type == TransactionType.CREDIT)
        elif insight_type == "expense":
            query = query.filter(Transaction.transaction_type == TransactionType.DEBIT)
        
        results = query.group_by(Transaction.category).all()
        
        return {category or "Uncategorized": total for category, total in results}
    
    def _get_daily_cash_flow(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[date, float]:
        """Get daily net cash flow"""
        results = self.db.query(
            func.date(Transaction.date).label('day'),
            func.sum(
                case(
                    [
                        (Transaction.transaction_type == TransactionType.CREDIT, 
                         Transaction.amount),
                        (Transaction.transaction_type == TransactionType.DEBIT,
                         -func.abs(Transaction.amount))
                    ],
                    else_=0
                )
            ).label('net_flow')
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).group_by('day').order_by('day').all()
        
        return {row.day: row.net_flow or 0 for row in results}
    
    def _analyze_weekday_spending(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, float]:
        """Analyze spending by weekday"""
        weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        results = self.db.query(
            extract('dow', Transaction.date).label('weekday'),
            func.sum(func.abs(Transaction.amount)).label('total')
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.transaction_type == TransactionType.DEBIT,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).group_by('weekday').all()
        
        # Initialize with zeros
        spending = {day: 0.0 for day in weekdays}
        
        # Fill with actual data
        for row in results:
            weekday_index = int(row.weekday)  # 0=Sunday in some DBs, adjust as needed
            spending[weekdays[weekday_index]] = float(row.total or 0)
        
        return spending
    
    def _analyze_time_of_day(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, float]:
        """Analyze spending by time of day"""
        time_slots = {
            "morning": (6, 12),    # 6am - 12pm
            "afternoon": (12, 18),  # 12pm - 6pm
            "evening": (18, 22),    # 6pm - 10pm
            "night": (22, 6)        # 10pm - 6am
        }
        
        spending = {slot: 0.0 for slot in time_slots.keys()}
        
        expenses = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.transaction_type == TransactionType.DEBIT,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).all()
        
        for expense in expenses:
            hour = expense.date.hour
            
            for slot, (start_hour, end_hour) in time_slots.items():
                if slot == "night":
                    if hour >= start_hour or hour < end_hour:
                        spending[slot] += abs(expense.amount)
                        break
                elif start_hour <= hour < end_hour:
                    spending[slot] += abs(expense.amount)
                    break
        
        return spending
    
    def _analyze_merchant_patterns(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Analyze spending by merchant/description patterns"""
        expenses = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.transaction_type == TransactionType.DEBIT,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).all()
        
        # Simple analysis: count occurrences of common merchant keywords
        merchant_keywords = {
            "amazon": "Amazon",
            "walmart": "Walmart",
            "target": "Target",
            "starbucks": "Starbucks",
            "uber": "Uber",
            "doordash": "DoorDash",
            "netflix": "Netflix",
            "spotify": "Spotify"
        }
        
        merchant_counts = defaultdict(int)
        merchant_totals = defaultdict(float)
        
        for expense in expenses:
            description_lower = expense.description.lower()
            
            matched = False
            for keyword, merchant in merchant_keywords.items():
                if keyword in description_lower:
                    merchant_counts[merchant] += 1
                    merchant_totals[merchant] += abs(expense.amount)
                    matched = True
                    break
            
            if not matched:
                merchant_counts["Other"] += 1
                merchant_totals["Other"] += abs(expense.amount)
        
        return {
            "merchant_counts": dict(merchant_counts),
            "merchant_totals": dict(merchant_totals),
            "top_merchant": max(merchant_totals.items(), key=lambda x: x[1], default=(None, 0))[0]
        }
    
    def _analyze_category_patterns(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Analyze spending patterns by category"""
        results = self.db.query(
            Transaction.category,
            func.count(Transaction.id).label('count'),
            func.sum(func.abs(Transaction.amount)).label('total'),
            func.avg(func.abs(Transaction.amount)).label('avg')
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.transaction_type == TransactionType.DEBIT,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).group_by(Transaction.category).all()
        
        categories = []
        for category, count, total, avg in results:
            categories.append({
                "category": category or "Uncategorized",
                "transaction_count": count,
                "total_amount": float(total or 0),
                "average_amount": float(avg or 0)
            })
        
        # Sort by total amount
        categories.sort(key=lambda x: x["total_amount"], reverse=True)
        
        return {
            "categories": categories[:10],  # Top 10 categories
            "total_categories": len(categories),
            "most_frequent_category": categories[0]["category"] if categories else None
        }
    
    def _calculate_habit_strength(self, habits: Dict[str, Any]) -> float:
        """Calculate a score indicating how strong spending habits are"""
        # Simple implementation: look for patterns in weekday spending
        weekday_spending = habits["weekday_spending"]
        
        if not weekday_spending:
            return 0.0
        
        values = list(weekday_spending.values())
        mean = statistics.mean(values)
        
        if mean == 0:
            return 0.0
        
        # Calculate coefficient of variation (lower = more consistent)
        if len(values) > 1:
            stdev = statistics.stdev(values)
            cv = stdev / mean
        else:
            cv = 0
        
        # Convert to strength score (0-1)
        # Lower CV = more consistent = stronger habits
        strength = max(0, 1 - cv)
        
        return round(strength, 2)