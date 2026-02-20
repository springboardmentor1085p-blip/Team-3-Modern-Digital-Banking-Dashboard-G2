"""
Service for generating and managing alerts
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.models.alert import Alert, AlertType, AlertStatus, EntityType
from app.models.transaction import Transaction, TransactionType
from app.models.account import Account
from app.models.budget import Budget
from app.models.bill import Bill
from app.crud.alert import CRUDAlert
from app.schemas.alert import AlertCreate

class AlertService:
    """Service for generating and managing alerts"""
    
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
        self.crud_alert = CRUDAlert(Alert)
    
    def check_and_generate_alerts(self) -> List[Alert]:
        """Check conditions and generate alerts based on user's data"""
        generated_alerts = []
        
        # Check for various alert conditions
        generated_alerts.extend(self._check_large_transactions())
        generated_alerts.extend(self._check_low_balances())
        generated_alerts.extend(self._check_budget_exceeded())
        generated_alerts.extend(self._check_unusual_spending())
        generated_alerts.extend(self._check_bills_due())
        generated_alerts.extend(self._check_subscription_renewals())
        generated_alerts.extend(self._check_savings_goals())
        generated_alerts.extend(self._check_cash_flow_warnings())
        
        return generated_alerts
    
    def generate_test_alerts(
        self, 
        alert_type: Optional[AlertType] = None,
        count: int = 5
    ) -> List[Alert]:
        """Generate test alerts (for development/testing)"""
        test_alerts = []
        alert_types = list(AlertType) if not alert_type else [alert_type]
        
        for i in range(min(count, len(alert_types))):
            alert_type = alert_types[i % len(alert_types)]
            
            alert_data = AlertCreate(
                alert_type=alert_type,
                title=f"Test Alert: {alert_type.value.replace('_', ' ').title()}",
                message=f"This is a test alert for {alert_type.value}. "
                       f"Generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                severity="info",
                entity_type=EntityType.TRANSACTION if i % 2 == 0 else None,
                entity_id=i + 1000 if i % 2 == 0 else None,
                is_actionable=i % 3 != 0
            )
            
            alert = self.crud_alert.create_user_alert(
                self.db,
                user_id=self.user_id,
                alert_type=alert_type,
                title=alert_data.title,
                message=alert_data.message,
                severity=alert_data.severity,
                entity_type=alert_data.entity_type,
                entity_id=alert_data.entity_id,
                is_actionable=alert_data.is_actionable
            )
            
            test_alerts.append(alert)
        
        return test_alerts
    
    def _check_large_transactions(self, threshold: float = 1000.0) -> List[Alert]:
        """Check for unusually large transactions"""
        alerts = []
        
        # Get large transactions from last 7 days
        start_date = datetime.now() - timedelta(days=7)
        
        large_transactions = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            func.abs(Transaction.amount) >= threshold,
            Transaction.status == "completed"
        ).all()
        
        for transaction in large_transactions:
            # Check if alert already exists for this transaction
            existing = self.crud_alert.get_by_criteria(
                self.db,
                user_id=self.user_id,
                alert_type=AlertType.LARGE_TRANSACTION,
                entity_type=EntityType.TRANSACTION,
                entity_id=transaction.id,
                created_after=datetime.now() - timedelta(hours=24)
            )
            
            if not existing:
                transaction_type = "Income" if transaction.amount > 0 else "Expense"
                
                alert = self.crud_alert.create_user_alert(
                    self.db,
                    user_id=self.user_id,
                    alert_type=AlertType.LARGE_TRANSACTION,
                    title=f"Large {transaction_type} Detected",
                    message=f"A large {transaction_type.lower()} of ${abs(transaction.amount):.2f} "
                           f"was recorded for '{transaction.description}'.",
                    severity="warning",
                    entity_type=EntityType.TRANSACTION,
                    entity_id=transaction.id,
                    entity_data={
                        "transaction_id": transaction.id,
                        "amount": transaction.amount,
                        "description": transaction.description,
                        "date": transaction.date.isoformat(),
                        "category": transaction.category
                    },
                    amount=abs(transaction.amount),
                    threshold=threshold
                )
                
                alerts.append(alert)
        
        return alerts
    
    def _check_low_balances(self, threshold_percentage: float = 20.0) -> List[Alert]:
        """Check for accounts with low balances"""
        alerts = []
        
        # Get all accounts
        accounts = self.db.query(Account).filter(
            Account.user_id == self.user_id,
            Account.is_active == True
        ).all()
        
        for account in accounts:
            # Skip credit cards (they typically have negative balances)
            if account.account_type == "CREDIT_CARD":
                continue
            
            # Calculate balance percentage of account limit
            if account.credit_limit and account.credit_limit > 0:
                balance_percentage = (account.balance / account.credit_limit) * 100
                
                if balance_percentage <= threshold_percentage:
                    # Check if alert already exists recently
                    existing = self.crud_alert.get_by_criteria(
                        self.db,
                        user_id=self.user_id,
                        alert_type=AlertType.LOW_BALANCE,
                        entity_type=EntityType.ACCOUNT,
                        entity_id=account.id,
                        created_after=datetime.now() - timedelta(days=1)
                    )
                    
                    if not existing:
                        alert = self.crud_alert.create_user_alert(
                            self.db,
                            user_id=self.user_id,
                            alert_type=AlertType.LOW_BALANCE,
                            title=f"Low Balance in {account.name}",
                            message=f"Your {account.name} account balance is ${account.balance:.2f}, "
                                   f"which is {balance_percentage:.1f}% of the account limit.",
                            severity="warning",
                            entity_type=EntityType.ACCOUNT,
                            entity_id=account.id,
                            entity_data={
                                "account_id": account.id,
                                "account_name": account.name,
                                "balance": account.balance,
                                "limit": account.credit_limit,
                                "percentage": balance_percentage
                            },
                            amount=account.balance,
                            threshold=threshold_percentage,
                            expires_at=datetime.now() + timedelta(days=7)
                        )
                        
                        alerts.append(alert)
        
        return alerts
    
    def _check_budget_exceeded(self, threshold_percentage: float = 90.0) -> List[Alert]:
        """Check for budgets that are close to or exceeded"""
        alerts = []
        
        # Get active budgets for current month
        now = datetime.now()

        budgets = self.db.query(Budget).filter(
            Budget.user_id == self.user_id,
            Budget.month == now.month,
            Budget.year == now.year
        ).all()
        
        for budget in budgets:
            # Calculate actual spending for budget category
            actual_spending = self.db.query(
                func.sum(func.abs(Transaction.amount))
            ).filter(
                Transaction.user_id == self.user_id,
                Transaction.category == budget.category,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.date >= budget.start_date,
                Transaction.date <= budget.end_date,
                Transaction.status == "completed"
            ).scalar() or 0
            
            # Calculate utilization percentage
            if budget.amount > 0:
                utilization = (actual_spending / budget.amount) * 100
            else:
                utilization = 0
            
            # Check if budget is exceeded or close to limit
            if utilization >= 100:
                alert_type = AlertType.BUDGET_EXCEEDED
                title = f"Budget Exceeded: {budget.category}"
                message = f"You have exceeded your {budget.category} budget by ${actual_spending - budget.amount:.2f}."
                severity = "critical"
            elif utilization >= threshold_percentage:
                alert_type = AlertType.BUDGET_NEARING_LIMIT     
                title = f"Budget Nearing Limit: {budget.category}"
                message = (
                    f"Your {budget.category} budget is {utilization:.1f}% used. "
                    f"Only ${budget.amount - actual_spending:.2f} remaining."
                )
                severity = "warning"

            else:
                continue
            
            # Check if alert already exists recently
            existing = self.crud_alert.get_by_criteria(
                self.db,
                user_id=self.user_id,
                alert_type=alert_type,
                entity_type=EntityType.BUDGET,
                entity_id=budget.id,
                created_after=datetime.now() - timedelta(days=1)
            )
            
            if not existing:
                alert = self.crud_alert.create_user_alert(
                    self.db,
                    user_id=self.user_id,
                    alert_type=alert_type,
                    title=title,
                    message=message,
                    severity=severity,
                    entity_type=EntityType.BUDGET,
                    entity_id=budget.id,
                    entity_data={
                        "budget_id": budget.id,
                        "category": budget.category,
                        "budget_amount": budget.amount,
                        "actual_spending": actual_spending,
                        "remaining": budget.amount - actual_spending,
                        "utilization_percentage": utilization
                    },
                    amount=actual_spending,
                    threshold=budget.amount,
                    is_actionable=True
                )
                
                alerts.append(alert)
        
        return alerts
    
    def _check_unusual_spending(self, threshold: float = 2.5) -> List[Alert]:
        """Check for unusual spending patterns"""
        alerts = []
        
        # This would integrate with the insight service's anomaly detection
        # For now, using a simplified version
        
        # Get expenses from last 30 days
        start_date = datetime.now() - timedelta(days=30)
        
        expenses = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.date >= start_date,
            Transaction.status == "completed"
        ).all()
        
        if len(expenses) < 10:
            return alerts
        
        # Group by category and find anomalies
        categories = {}
        for expense in expenses:
            category = expense.category or "Uncategorized"
            if category not in categories:
                categories[category] = []
            categories[category].append(abs(expense.amount))
        
        for category, amounts in categories.items():
            if len(amounts) < 5:
                continue
            
            # Calculate mean and standard deviation
            import statistics
            mean = statistics.mean(amounts)
            if len(amounts) > 1:
                stdev = statistics.stdev(amounts)
            else:
                stdev = 0
            
            # Find expenses that are > threshold standard deviations from mean
            for expense in expenses:
                if (expense.category or "Uncategorized") != category:
                    continue
                
                amount = abs(expense.amount)
                if stdev > 0 and amount > mean + (threshold * stdev):
                    # Check if alert already exists
                    existing = self.crud_alert.get_by_criteria(
                        self.db,
                        user_id=self.user_id,
                        alert_type=AlertType.UNUSUAL_SPENDING,
                        entity_type=EntityType.TRANSACTION,
                        entity_id=expense.id,
                        created_after=datetime.now() - timedelta(days=2)
                    )
                    
                    if not existing:
                        alert = self.crud_alert.create_user_alert(
                            self.db,
                            user_id=self.user_id,
                            alert_type=AlertType.UNUSUAL_SPENDING,
                            title=f"Unusual Spending in {category}",
                            message=f"An unusual expense of ${amount:.2f} was detected in {category}. "
                                   f"This is significantly higher than your average of ${mean:.2f}.",
                            severity="warning",
                            entity_type=EntityType.TRANSACTION,
                            entity_id=expense.id,
                            entity_data={
                                "transaction_id": expense.id,
                                "category": category,
                                "amount": amount,
                                "average_amount": mean,
                                "standard_deviation": stdev,
                                "deviation_score": (amount - mean) / stdev if stdev > 0 else 0
                            },
                            amount=amount,
                            threshold=mean,
                            is_actionable=True
                        )
                        
                        alerts.append(alert)
        
        return alerts
    
    def _check_bills_due(self, days_ahead: int = 3) -> List[Alert]:
        """Check for upcoming bill due dates"""
        alerts = []
        
        # Get upcoming bills
        today = datetime.now().date()
        due_date = today + timedelta(days=days_ahead)
        
        bills = self.db.query(Bill).filter(
            Bill.user_id == self.user_id,
            Bill.is_active == True,
            Bill.due_date >= today,
            Bill.due_date <= due_date
        ).all()
        
        for bill in bills:
            # Calculate days until due
            days_until_due = (bill.due_date - today).days
            
            # Determine severity based on how soon bill is due
            if days_until_due == 0:
                severity = "critical"
                title = f"Bill Due Today: {bill.name}"
                message = f"Your bill for {bill.name} is due today. Amount: ${bill.amount:.2f}"
            elif days_until_due == 1:
                severity = "warning"
                title = f"Bill Due Tomorrow: {bill.name}"
                message = f"Your bill for {bill.name} is due tomorrow. Amount: ${bill.amount:.2f}"
            else:
                severity = "info"
                title = f"Upcoming Bill: {bill.name}"
                message = f"Your bill for {bill.name} is due in {days_until_due} days. Amount: ${bill.amount:.2f}"
            
            # Check if alert already exists
            existing = self.crud_alert.get_by_criteria(
                self.db,
                user_id=self.user_id,
                alert_type=AlertType.BILL_DUE,
                entity_type=EntityType.BILL,
                entity_id=bill.id,
                created_after=datetime.now() - timedelta(days=1)
            )
            
            if not existing:
                alert = self.crud_alert.create_user_alert(
                    self.db,
                    user_id=self.user_id,
                    alert_type=AlertType.BILL_DUE,
                    title=title,
                    message=message,
                    severity=severity,
                    entity_type=EntityType.BILL,
                    entity_id=bill.id,
                    entity_data={
                        "bill_id": bill.id,
                        "bill_name": bill.name,
                        "amount": bill.amount,
                        "due_date": bill.due_date.isoformat(),
                        "days_until_due": days_until_due,
                        "is_autopay": bill.is_autopay
                    },
                    amount=bill.amount,
                    is_actionable=True,
                    expires_at=datetime.combine(bill.due_date, datetime.max.time())
                )
                
                alerts.append(alert)
        
        return alerts
    
    def _check_subscription_renewals(self, days_ahead: int = 7) -> List[Alert]:
        """Check for upcoming subscription renewals"""
        alerts = []
        
        # Get recurring transactions (subscriptions)
        today = datetime.now().date()
        renewal_date = today + timedelta(days=days_ahead)
        
        # Assuming we have a way to identify subscriptions
        # This is a simplified version
        subscriptions = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.is_recurring == True,
            Transaction.recurrence_end_date >= today,
            Transaction.recurrence_next_date >= today,
            Transaction.recurrence_next_date <= renewal_date
        ).all()
        
        for subscription in subscriptions:
            if not subscription.recurrence_next_date:
                continue
            
            days_until_renewal = (subscription.recurrence_next_date - today).days
            
            alert = self.crud_alert.create_user_alert(
                self.db,
                user_id=self.user_id,
                alert_type=AlertType.SUBSCRIPTION_RENEWAL,
                title=f"Subscription Renewal: {subscription.description}",
                message=f"Your subscription for '{subscription.description}' "
                       f"will renew in {days_until_renewal} days. Amount: ${abs(subscription.amount):.2f}",
                severity="info" if days_until_renewal > 3 else "warning",
                entity_type=EntityType.TRANSACTION,
                entity_id=subscription.id,
                entity_data={
                    "transaction_id": subscription.id,
                    "description": subscription.description,
                    "amount": abs(subscription.amount),
                    "renewal_date": subscription.recurrence_next_date.isoformat(),
                    "days_until_renewal": days_until_renewal,
                    "recurrence_frequency": subscription.recurrence_frequency
                },
                amount=abs(subscription.amount),
                is_actionable=True
            )
            
            alerts.append(alert)
        
        return alerts
    
    def _check_savings_goals(self) -> List[Alert]:
        """Check progress on savings goals"""
        alerts = []
        
        # This would integrate with a savings goals feature
        # For now, returning empty list
        return alerts
    
    def _check_cash_flow_warnings(self) -> List[Alert]:
        """Check for cash flow warnings"""
        alerts = []
        
        # Get cash flow for current month
        now = datetime.now()
        month_start = datetime(now.year, now.month, 1)
        
        # Calculate income and expenses for month so far
        income = self.db.query(
            func.sum(Transaction.amount)
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.transaction_type == TransactionType.INCOME,
            Transaction.date >= month_start,
            Transaction.date <= now,
            Transaction.status == "completed"
        ).scalar() or 0
        
        expenses = self.db.query(
            func.sum(func.abs(Transaction.amount))
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.date >= month_start,
            Transaction.date <= now,
            Transaction.status == "completed"
        ).scalar() or 0
        
        # Calculate net cash flow and projection
        days_passed = (now - month_start).days + 1
        days_in_month = 30  # Approximation
        
        avg_daily_expenses = expenses / days_passed if days_passed > 0 else 0
        projected_expenses = avg_daily_expenses * days_in_month
        
        # Check for warning conditions
        if income > 0 and expenses > 0:
            # Check if expenses are significantly higher than income
            if expenses > income * 1.2:  # Spending 20% more than income
                alert = self.crud_alert.create_user_alert(
                    self.db,
                    user_id=self.user_id,
                    alert_type=AlertType.CASH_FLOW_WARNING,
                    title="High Spending Alert",
                    message=f"Your spending (${expenses:.2f}) is significantly higher than "
                           f"your income (${income:.2f}) this month.",
                    severity="warning",
                    amount=expenses,
                    threshold=income,
                    is_actionable=True
                )
                alerts.append(alert)
            
            # Check if projected expenses exceed income
            if projected_expenses > income * 1.5:
                alert = self.crud_alert.create_user_alert(
                    self.db,
                    user_id=self.user_id,
                    alert_type=AlertType.CASH_FLOW_WARNING,
                    title="Projected Overspending",
                    message=f"Based on current spending, you're projected to spend "
                           f"${projected_expenses:.2f} this month, which exceeds your income.",
                    severity="critical",
                    amount=projected_expenses,
                    threshold=income,
                    is_actionable=True
                )
                alerts.append(alert)
        
        return alerts
    
    def create_income_received_alert(self, transaction: Transaction) -> Alert:
        """Create alert for received income"""
        return self.crud_alert.create_user_alert(
            self.db,
            user_id=self.user_id,
            alert_type=AlertType.INCOME_RECEIVED,
            title="Income Received",
            message=f"Income of ${transaction.amount:.2f} received from '{transaction.description}'.",
            severity="info",
            entity_type=EntityType.TRANSACTION,
            entity_id=transaction.id,
            entity_data={
                "transaction_id": transaction.id,
                "amount": transaction.amount,
                "description": transaction.description,
                "date": transaction.date.isoformat()
            },
            amount=transaction.amount,
            is_actionable=False
        )
    
    def cleanup_old_alerts(self, days_old: int = 30) -> int:
        """Clean up old alerts"""
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        # Archive old alerts
        updated = self.db.query(Alert).filter(
            Alert.user_id == self.user_id,
            Alert.created_at < cutoff_date,
            Alert.status == AlertStatus.ACTIVE
        ).update(
            {
                Alert.status: AlertStatus.ARCHIVED,
                Alert.is_read: True
            },
            synchronize_session=False
        )
        
        self.db.commit()
        return updated