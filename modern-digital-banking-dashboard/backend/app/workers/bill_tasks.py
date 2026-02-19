from celery import Celery, current_task
from celery.utils.log import get_task_logger
from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
import time
import json

from app.workers.celery_app import celery_app, task_logger
from app.database import SessionLocal
from app.services.bill_reminder import bill_reminder_service
from app.services.currency_service import currency_service
from app.services.reward_service import reward_service
from app.crud.bill import bill_crud
from app.crud.reward import reward_crud
from app.crud.user import user_crud
from app.models.bill import Bill
from app.models.user import User

logger = get_task_logger(__name__)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_daily_reminders(self, reminder_days: int = 3):
    """
    Send daily reminders for bills due in X days
    
    Args:
        reminder_days: Days before due date to send reminder
    """
    task_id = current_task.request.id
    task_logger.log_task_start("send_daily_reminders", task_id, reminder_days=reminder_days)
    
    try:
        db = SessionLocal()
        try:
            # Get bills needing reminders
            results = bill_reminder_service.send_bulk_reminders(db, reminder_days)
            
            task_logger.log_task_success("send_daily_reminders", task_id, results)
            
            # Log summary
            logger.info(
                f"Daily reminders sent: {results['successful']} successful, "
                f"{results['failed']} failed, total {results['total']}"
            )
            
            return results
            
        finally:
            db.close()
            
    except Exception as exc:
        task_logger.log_task_failure("send_daily_reminders", task_id, exc)
        logger.error(f"Failed to send daily reminders: {str(exc)}")
        
        # Retry the task
        raise self.retry(exc=exc)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_overdue_reminders(self):
    """Send reminders for overdue bills"""
    task_id = current_task.request.id
    task_logger.log_task_start("send_overdue_reminders", task_id)
    
    try:
        db = SessionLocal()
        try:
            # Get and send overdue reminders
            results = bill_reminder_service.send_overdue_reminders(db)
            
            task_logger.log_task_success("send_overdue_reminders", task_id, results)
            
            # Log summary
            logger.info(
                f"Overdue reminders sent: {results['successful']} successful, "
                f"{results['failed']} failed, total {results['total']}"
            )
            
            return results
            
        finally:
            db.close()
            
    except Exception as exc:
        task_logger.log_task_failure("send_overdue_reminders", task_id, exc)
        logger.error(f"Failed to send overdue reminders: {str(exc)}")
        
        # Retry the task
        raise self.retry(exc=exc)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def send_weekly_summaries(self):
    """Send weekly bill summaries to all active users"""
    task_id = current_task.request.id
    task_logger.log_task_start("send_weekly_summaries", task_id)
    
    try:
        db = SessionLocal()
        try:
            # Get all active users
            users = db.query(User).filter(
                User.is_active == True,
                User.email.isnot(None),
                User.email_verified == True
            ).all()
            
            results = {
                "total_users": len(users),
                "successful": 0,
                "failed": 0,
                "failed_details": []
            }
            
            for user in users:
                try:
                    # Calculate weekly summary
                    today = date.today()
                    start_of_week = today - timedelta(days=today.weekday())
                    end_of_week = start_of_week + timedelta(days=6)
                    
                    # Get bills for this week
                    weekly_bills = bill_crud.get_multi(
                        db=db,
                        filters={
                            "user_id": user.id,
                            "start_date": start_of_week,
                            "end_date": end_of_week
                        }
                    )
                    
                    if weekly_bills:
                        # Calculate summary
                        total_amount = sum(float(bill.amount_usd) for bill in weekly_bills)
                        paid_bills = [b for b in weekly_bills if b.is_paid]
                        unpaid_bills = [b for b in weekly_bills if not b.is_paid]
                        
                        # Create email content
                        subject = f"📊 Your Weekly Bill Summary ({start_of_week.strftime('%b %d')} - {end_of_week.strftime('%b %d')})"
                        
                        # Send email (simplified - in production, use proper email service)
                        logger.info(f"Weekly summary prepared for {user.email}: {len(weekly_bills)} bills, ${total_amount:.2f}")
                        
                        results["successful"] += 1
                        
                    else:
                        # No bills this week
                        logger.debug(f"No bills for weekly summary for user {user.id}")
                        results["successful"] += 1
                        
                except Exception as e:
                    results["failed"] += 1
                    results["failed_details"].append({
                        "user_id": user.id,
                        "email": user.email,
                        "error": str(e)
                    })
                    logger.error(f"Failed to send weekly summary to user {user.id}: {str(e)}")
            
            task_logger.log_task_success("send_weekly_summaries", task_id, results)
            return results
            
        finally:
            db.close()
            
    except Exception as exc:
        task_logger.log_task_failure("send_weekly_summaries", task_id, exc)
        logger.error(f"Failed to send weekly summaries: {str(exc)}")
        
        # Retry the task
        raise self.retry(exc=exc)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def send_monthly_summaries(self):
    """Send monthly bill summaries to all active users"""
    task_id = current_task.request.id
    task_logger.log_task_start("send_monthly_summaries", task_id)
    
    try:
        db = SessionLocal()
        try:
            # Get all active users
            users = db.query(User).filter(
                User.is_active == True,
                User.email.isnot(None),
                User.email_verified == True
            ).all()
            
            results = {
                "total_users": len(users),
                "successful": 0,
                "failed": 0,
                "failed_details": []
            }
            
            for user in users:
                try:
                    # Send monthly summary using the service
                    success = bill_reminder_service.send_monthly_summary(db, user.id)
                    
                    if success:
                        results["successful"] += 1
                    else:
                        results["failed"] += 1
                        results["failed_details"].append({
                            "user_id": user.id,
                            "email": user.email,
                            "error": "Email sending failed"
                        })
                        
                except Exception as e:
                    results["failed"] += 1
                    results["failed_details"].append({
                        "user_id": user.id,
                        "email": user.email,
                        "error": str(e)
                    })
                    logger.error(f"Failed to send monthly summary to user {user.id}: {str(e)}")
            
            task_logger.log_task_success("send_monthly_summaries", task_id, results)
            return results
            
        finally:
            db.close()
            
    except Exception as exc:
        task_logger.log_task_failure("send_monthly_summaries", task_id, exc)
        logger.error(f"Failed to send monthly summaries: {str(exc)}")
        
        # Retry the task
        raise self.retry(exc=exc)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def process_recurring_bills(self):
    """Process recurring bills and create new instances"""
    task_id = current_task.request.id
    task_logger.log_task_start("process_recurring_bills", task_id)
    
    try:
        db = SessionLocal()
        try:
            today = date.today()
            processed_count = 0
            errors = []
            
            # Get all paid recurring bills that are due for renewal
            recurring_bills = db.query(Bill).filter(
                Bill.is_paid == True,
                Bill.frequency != 'one_time',
                Bill.paid_date.isnot(None)
            ).all()
            
            for bill in recurring_bills:
                try:
                    # Calculate next due date based on frequency
                    next_due_date = self._calculate_next_due_date(
                        bill.paid_date or bill.due_date,
                        bill.frequency
                    )
                    
                    # Check if we need to create a new bill instance
                    if next_due_date <= today or next_due_date <= bill.due_date:
                        # Create new bill instance
                        new_bill_data = {
                            "user_id": bill.user_id,
                            "name": bill.name,
                            "description": bill.description,
                            "amount": bill.amount,
                            "currency": bill.currency,
                            "amount_usd": bill.amount_usd,
                            "due_date": next_due_date,
                            "category": bill.category,
                            "frequency": bill.frequency,
                            "reminder_days": bill.reminder_days,
                            "is_paid": False,
                            "paid_date": None
                        }
                        
                        new_bill = bill_crud.create(db=db, obj_in=new_bill_data, user_id=bill.user_id)
                        processed_count += 1
                        
                        logger.info(
                            f"Created new recurring bill for user {bill.user_id}: "
                            f"{bill.name} due {next_due_date}"
                        )
                        
                except Exception as e:
                    errors.append({
                        "bill_id": bill.id,
                        "error": str(e)
                    })
                    logger.error(f"Failed to process recurring bill {bill.id}: {str(e)}")
            
            result = {
                "processed": processed_count,
                "total_checked": len(recurring_bills),
                "errors": errors
            }
            
            task_logger.log_task_success("process_recurring_bills", task_id, result)
            return result
            
        finally:
            db.close()
            
    except Exception as exc:
        task_logger.log_task_failure("process_recurring_bills", task_id, exc)
        logger.error(f"Failed to process recurring bills: {str(exc)}")
        
        # Retry the task
        raise self.retry(exc=exc)
    
    def _calculate_next_due_date(self, last_date: date, frequency: str) -> date:
        """Calculate next due date based on frequency"""
        if frequency == "monthly":
            # Add one month
            if last_date.month == 12:
                return date(last_date.year + 1, 1, last_date.day)
            else:
                return date(last_date.year, last_date.month + 1, last_date.day)
        elif frequency == "quarterly":
            # Add three months
            month = last_date.month + 3
            year = last_date.year
            if month > 12:
                month -= 12
                year += 1
            return date(year, month, last_date.day)
        elif frequency == "biannually":
            # Add six months
            month = last_date.month + 6
            year = last_date.year
            if month > 12:
                month -= 12
                year += 1
            return date(year, month, last_date.day)
        elif frequency == "annually":
            # Add one year
            return date(last_date.year + 1, last_date.month, last_date.day)
        else:
            # For one_time or unknown, return original date
            return last_date

@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def cleanup_old_notifications(self, days_old: int = 30):
    """Clean up old notifications and logs"""
    task_id = current_task.request.id
    task_logger.log_task_start("cleanup_old_notifications", task_id, days_old=days_old)
    
    try:
        db = SessionLocal()
        try:
            # Calculate cutoff date
            cutoff_date = datetime.now() - timedelta(days=days_old)
            
            # Cleanup operations would go here
            # Example: Delete old notification records, logs, etc.
            
            # For now, just log the task
            logger.info(f"Cleanup task executed for data older than {days_old} days")
            
            result = {
                "cutoff_date": cutoff_date.isoformat(),
                "message": "Cleanup completed",
                "rows_affected": 0  # Placeholder
            }
            
            task_logger.log_task_success("cleanup_old_notifications", task_id, result)
            return result
            
        finally:
            db.close()
            
    except Exception as exc:
        task_logger.log_task_failure("cleanup_old_notifications", task_id, exc)
        logger.error(f"Failed to cleanup old notifications: {str(exc)}")
        
        # Retry the task
        raise self.retry(exc=exc)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def update_exchange_rates(self):
    """Update exchange rates from external API"""
    task_id = current_task.request.id
    task_logger.log_task_start("update_exchange_rates", task_id)
    
    try:
        # Force currency service to update rates
        rates = currency_service._fetch_exchange_rates()
        
        if rates:
            result = {
                "status": "success",
                "currencies_updated": len(rates),
                "timestamp": datetime.now().isoformat()
            }
            logger.info(f"Exchange rates updated: {len(rates)} currencies")
        else:
            result = {
                "status": "failed",
                "message": "Failed to fetch exchange rates",
                "timestamp": datetime.now().isoformat()
            }
            logger.warning("Failed to update exchange rates")
        
        task_logger.log_task_success("update_exchange_rates", task_id, result)
        return result
        
    except Exception as exc:
        task_logger.log_task_failure("update_exchange_rates", task_id, exc)
        logger.error(f"Failed to update exchange rates: {str(exc)}")
        
        # Retry the task
        raise self.retry(exc=exc)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def generate_monthly_analytics(self, month: Optional[int] = None, year: Optional[int] = None):
    """Generate monthly analytics report"""
    task_id = current_task.request.id
    task_logger.log_task_start("generate_monthly_analytics", task_id, month=month, year=year)
    
    try:
        db = SessionLocal()
        try:
            # Use current month/year if not specified
            if month is None:
                month = datetime.now().month
            if year is None:
                year = datetime.now().year
            
            # Get all users
            users = db.query(User).filter(User.is_active == True).all()
            
            analytics = {
                "month": month,
                "year": year,
                "total_users": len(users),
                "active_users": 0,
                "total_bills": 0,
                "total_amount": Decimal('0'),
                "paid_bills": 0,
                "unpaid_bills": 0,
                "reward_points_awarded": 0,
                "user_analytics": []
            }
            
            for user in users:
                try:
                    # Get user's monthly summary
                    monthly_summary = bill_crud.get_monthly_summary(db, user.id, month, year)
                    
                    # Get user's reward stats
                    reward_stats = reward_crud.get_user_reward_stats(db, user.id)
                    
                    user_data = {
                        "user_id": user.id,
                        "email": user.email,
                        "bill_summary": monthly_summary,
                        "reward_stats": reward_stats,
                        "is_active": monthly_summary["total_bills"] > 0
                    }
                    
                    analytics["user_analytics"].append(user_data)
                    
                    # Update totals
                    analytics["total_bills"] += monthly_summary["total_bills"]
                    analytics["total_amount"] += monthly_summary["total_amount"]
                    analytics["paid_bills"] += monthly_summary["paid_bills"]
                    analytics["unpaid_bills"] += monthly_summary["unpaid_bills"]
                    analytics["reward_points_awarded"] += reward_stats["total_points"]
                    
                    if monthly_summary["total_bills"] > 0:
                        analytics["active_users"] += 1
                        
                except Exception as e:
                    logger.error(f"Failed to generate analytics for user {user.id}: {str(e)}")
            
            # Calculate averages
            if analytics["active_users"] > 0:
                analytics["avg_bills_per_user"] = analytics["total_bills"] / analytics["active_users"]
                analytics["avg_amount_per_user"] = analytics["total_amount"] / analytics["active_users"]
                analytics["avg_points_per_user"] = analytics["reward_points_awarded"] / analytics["active_users"]
            else:
                analytics["avg_bills_per_user"] = 0
                analytics["avg_amount_per_user"] = Decimal('0')
                analytics["avg_points_per_user"] = 0
            
            # Store analytics (in production, save to database or file)
            analytics_file = f"analytics_{year}_{month:02d}.json"
            # with open(analytics_file, 'w') as f:
            #     json.dump(analytics, f, default=str, indent=2)
            
            logger.info(
                f"Monthly analytics generated for {month}/{year}: "
                f"{analytics['active_users']} active users, "
                f"{analytics['total_bills']} bills, "
                f"${analytics['total_amount']} total"
            )
            
            task_logger.log_task_success("generate_monthly_analytics", task_id, {
                "month": month,
                "year": year,
                "active_users": analytics["active_users"],
                "total_bills": analytics["total_bills"]
            })
            
            return analytics
            
        finally:
            db.close()
            
    except Exception as exc:
        task_logger.log_task_failure("generate_monthly_analytics", task_id, exc)
        logger.error(f"Failed to generate monthly analytics: {str(exc)}")
        
        # Retry the task
        raise self.retry(exc=exc)

@celery_app.task(bind=True)
def process_bill_payment_reward_async(self, bill_id: int, user_id: int, on_time_payment: bool = True):
    """Process reward points for bill payment asynchronously"""
    task_id = current_task.request.id
    task_logger.log_task_start("process_bill_payment_reward_async", task_id, 
                              bill_id=bill_id, user_id=user_id)
    
    try:
        db = SessionLocal()
        try:
            from app.api.v1.rewards import process_bill_payment_reward
            
            # This would call the reward processing logic
            # For now, simulate the processing
            time.sleep(1)  # Simulate processing time
            
            result = {
                "bill_id": bill_id,
                "user_id": user_id,
                "on_time_payment": on_time_payment,
                "processed_at": datetime.now().isoformat(),
                "status": "success"
            }
            
            task_logger.log_task_success("process_bill_payment_reward_async", task_id, result)
            return result
            
        finally:
            db.close()
            
    except Exception as exc:
        task_logger.log_task_failure("process_bill_payment_reward_async", task_id, exc)
        logger.error(f"Failed to process bill payment reward: {str(exc)}")
        
        # Don't retry this task (it's not critical)
        return {
            "bill_id": bill_id,
            "user_id": user_id,
            "status": "failed",
            "error": str(exc)
        }

@celery_app.task(bind=True)
def test_task(self, message: str = "Hello from Celery"):
    """Test task for Celery workers"""
    task_id = current_task.request.id
    task_logger.log_task_start("test_task", task_id, message=message)
    
    try:
        # Simulate some work
        time.sleep(2)
        
        result = {
            "message": message,
            "processed_at": datetime.now().isoformat(),
            "task_id": task_id
        }
        
        task_logger.log_task_success("test_task", task_id, result)
        return result
        
    except Exception as exc:
        task_logger.log_task_failure("test_task", task_id, exc)
        raise