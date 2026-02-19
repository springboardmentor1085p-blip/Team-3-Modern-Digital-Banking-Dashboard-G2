from typing import List, Dict, Optional
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from jinja2 import Template

from app.database import get_db
from app.models.bill import Bill
from app.models.user import User
from app.crud.bill import bill_crud
from app.core.config import settings

logger = logging.getLogger(__name__)

class BillReminderService:
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.sender_email = settings.SENDER_EMAIL
    
    def get_bills_needing_reminder(self, db: Session, days_before: int = 3) -> List[Bill]:
        """Get bills that need reminders based on due date"""
        today = date.today()
        reminder_date = today + timedelta(days=days_before)
        
        # Get unpaid bills due on reminder date
        bills = db.query(Bill).join(User).filter(
            Bill.is_paid == False,
            Bill.due_date == reminder_date,
            User.is_active == True,
            User.email.isnot(None)
        ).all()
        
        logger.info(f"Found {len(bills)} bills needing reminders for {reminder_date}")
        return bills
    
    def get_overdue_bills(self, db: Session) -> List[Bill]:
        """Get all overdue bills"""
        today = date.today()
        
        overdue_bills = db.query(Bill).join(User).filter(
            Bill.is_paid == False,
            Bill.due_date < today,
            User.is_active == True,
            User.email.isnot(None)
        ).all()
        
        logger.info(f"Found {len(overdue_bills)} overdue bills")
        return overdue_bills
    
    def send_reminder_email(self, bill: Bill, user: User, reminder_type: str = "upcoming") -> bool:
        """Send reminder email to user about a bill"""
        try:
            # Create email content
            subject, html_content = self._create_email_content(bill, user, reminder_type)
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.sender_email
            msg['To'] = user.email
            
            # Attach HTML content
            part = MIMEText(html_content, 'html')
            msg.attach(part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.smtp_username and self.smtp_password:
                    server.starttls()
                    server.login(self.smtp_username, self.smtp_password)
                
                server.send_message(msg)
            
            logger.info(f"Sent {reminder_type} reminder email for bill {bill.id} to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send reminder email for bill {bill.id}: {str(e)}")
            return False
    
    def _create_email_content(self, bill: Bill, user: User, reminder_type: str) -> tuple:
        """Create email subject and HTML content"""
        days_until_due = (bill.due_date - date.today()).days
        
        if reminder_type == "upcoming":
            subject = f"📅 Reminder: {bill.name} bill due in {days_until_due} days"
            status = "upcoming"
        elif reminder_type == "overdue":
            subject = f"⚠️ URGENT: {bill.name} bill is OVERDUE!"
            status = "overdue"
        else:
            subject = f"Reminder: {bill.name} bill"
            status = "general"
        
        # Create HTML template
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: {% if status == 'overdue' %}#dc3545{% else %}#007bff{% endif %}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px; }
                .bill-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                .footer { margin-top: 30px; font-size: 12px; color: #6c757d; text-align: center; }
                .status-badge { display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                .status-upcoming { background-color: #ffc107; color: #212529; }
                .status-overdue { background-color: #dc3545; color: white; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Bill Payment Reminder</h1>
                    <p>Hi {{ user_name }}, this is a reminder about your bill.</p>
                </div>
                
                <div class="content">
                    <div class="bill-details">
                        <h2>{{ bill_name }}</h2>
                        
                        <div class="status-badge status-{{ status }}">
                            {% if status == 'overdue' %}
                                OVERDUE
                            {% else %}
                                Due in {{ days_until_due }} days
                            {% endif %}
                        </div>
                        
                        <table style="width: 100%; margin-top: 20px;">
                            <tr>
                                <td><strong>Amount:</strong></td>
                                <td>{{ amount }} {{ currency }}</td>
                            </tr>
                            <tr>
                                <td><strong>Due Date:</strong></td>
                                <td>{{ due_date }}</td>
                            </tr>
                            <tr>
                                <td><strong>Category:</strong></td>
                                <td>{{ category }}</td>
                            </tr>
                            <tr>
                                <td><strong>Frequency:</strong></td>
                                <td>{{ frequency }}</td>
                            </tr>
                        </table>
                        
                        {% if description %}
                        <p style="margin-top: 20px;"><strong>Description:</strong> {{ description }}</p>
                        {% endif %}
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{{ app_url }}/bills/{{ bill_id }}" class="button">View Bill Details</a>
                        <a href="{{ app_url }}/bills/{{ bill_id }}/pay" style="margin-left: 10px; background-color: #007bff;" class="button">Mark as Paid</a>
                    </div>
                    
                    <div style="margin-top: 30px; padding: 15px; background-color: #e9ecef; border-radius: 5px;">
                        <h3>💡 Tips for Bill Management:</h3>
                        <ul>
                            <li>Set up automatic payments for recurring bills</li>
                            <li>Pay bills as soon as you receive them to avoid forgetting</li>
                            <li>Use the reward system to earn points for on-time payments</li>
                            <li>Review your bills monthly to catch any errors</li>
                        </ul>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is an automated reminder from {{ app_name }}. Please do not reply to this email.</p>
                    <p>If you have already paid this bill, please mark it as paid in the app.</p>
                    <p><a href="{{ app_url }}/unsubscribe">Unsubscribe from reminders</a> | 
                       <a href="{{ app_url }}/preferences">Manage email preferences</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Render template
        template = Template(html_template)
        html_content = template.render(
            user_name=user.username or user.email.split('@')[0],
            bill_name=bill.name,
            status=status,
            days_until_due=days_until_due,
            amount=bill.amount,
            currency=bill.currency.value,
            due_date=bill.due_date.strftime('%B %d, %Y'),
            category=bill.category,
            frequency=bill.frequency.value.replace('_', ' ').title(),
            description=bill.description or '',
            bill_id=bill.id,
            app_name=settings.PROJECT_NAME,
            app_url=settings.FRONTEND_URL
        )
        
        return subject, html_content
    
    def send_bulk_reminders(self, db: Session, reminder_days: int = 3) -> Dict[str, int]:
        """Send reminders for all bills due in X days"""
        bills = self.get_bills_needing_reminder(db, reminder_days)
        
        results = {
            "total": len(bills),
            "successful": 0,
            "failed": 0,
            "failed_details": []
        }
        
        for bill in bills:
            try:
                success = self.send_reminder_email(bill, bill.user, "upcoming")
                if success:
                    results["successful"] += 1
                else:
                    results["failed"] += 1
                    results["failed_details"].append({
                        "bill_id": bill.id,
                        "user_email": bill.user.email,
                        "reason": "Email sending failed"
                    })
            except Exception as e:
                results["failed"] += 1
                results["failed_details"].append({
                    "bill_id": bill.id,
                    "user_email": bill.user.email,
                    "reason": str(e)
                })
        
        return results
    
    def send_overdue_reminders(self, db: Session) -> Dict[str, int]:
        """Send reminders for all overdue bills"""
        bills = self.get_overdue_bills(db)
        
        results = {
            "total": len(bills),
            "successful": 0,
            "failed": 0,
            "failed_details": []
        }
        
        for bill in bills:
            try:
                success = self.send_reminder_email(bill, bill.user, "overdue")
                if success:
                    results["successful"] += 1
                else:
                    results["failed"] += 1
                    results["failed_details"].append({
                        "bill_id": bill.id,
                        "user_email": bill.user.email,
                        "reason": "Email sending failed"
                    })
            except Exception as e:
                results["failed"] += 1
                results["failed_details"].append({
                    "bill_id": bill.id,
                    "user_email": bill.user.email,
                    "reason": str(e)
                })
        
        return results
    
    def send_monthly_summary(self, db: Session, user_id: int) -> bool:
        """Send monthly bill summary to user"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user or not user.email:
                return False
            
            # Get monthly summary
            today = date.today()
            monthly_summary = bill_crud.get_monthly_summary(
                db=db,
                user_id=user_id,
                month=today.month,
                year=today.year
            )
            
            # Create summary email
            subject = f"📊 Your {today.strftime('%B %Y')} Bill Summary"
            html_content = self._create_monthly_summary_content(user, monthly_summary, today)
            
            # Send email
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.sender_email
            msg['To'] = user.email
            
            part = MIMEText(html_content, 'html')
            msg.attach(part)
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.smtp_username and self.smtp_password:
                    server.starttls()
                    server.login(self.smtp_username, self.smtp_password)
                
                server.send_message(msg)
            
            logger.info(f"Sent monthly summary to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send monthly summary to user {user_id}: {str(e)}")
            return False
    
    def _create_monthly_summary_content(self, user: User, summary: Dict, month_date: date) -> str:
        """Create monthly summary email content"""
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #6f42c1; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
                .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px; }
                .summary-card { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .stat { text-align: center; padding: 15px; }
                .stat-value { font-size: 24px; font-weight: bold; color: #6f42c1; }
                .stat-label { font-size: 14px; color: #6c757d; }
                .category-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
                .category-name { font-weight: bold; }
                .category-amount { color: #28a745; }
                .button { display: inline-block; padding: 12px 24px; background-color: #6f42c1; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                .footer { margin-top: 30px; font-size: 12px; color: #6c757d; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Monthly Bill Summary</h1>
                    <p>Hi {{ user_name }}, here's your {{ month_name }} bill summary.</p>
                </div>
                
                <div class="content">
                    <div class="summary-card">
                        <h2>📈 Monthly Overview</h2>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
                            <div class="stat">
                                <div class="stat-value">{{ total_bills }}</div>
                                <div class="stat-label">Total Bills</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">${{ "%.2f"|format(total_amount) }}</div>
                                <div class="stat-label">Total Amount</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">{{ paid_bills }}</div>
                                <div class="stat-label">Paid Bills</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">{{ unpaid_bills }}</div>
                                <div class="stat-label">Unpaid Bills</div>
                            </div>
                        </div>
                    </div>
                    
                    {% if category_breakdown %}
                    <div class="summary-card">
                        <h2>📊 Spending by Category</h2>
                        
                        {% for category in category_breakdown %}
                        <div class="category-row">
                            <span class="category-name">{{ category.category }}</span>
                            <span class="category-amount">${{ "%.2f"|format(category.total_amount) }}</span>
                        </div>
                        {% endfor %}
                    </div>
                    {% endif %}
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{{ app_url }}/dashboard" class="button">View Full Dashboard</a>
                        <a href="{{ app_url }}/bills" style="margin-left: 10px; background-color: #28a745;" class="button">Manage Bills</a>
                    </div>
                    
                    <div style="margin-top: 30px; padding: 15px; background-color: #e9ecef; border-radius: 5px;">
                        <h3>🎯 Tips for Next Month:</h3>
                        <ul>
                            <li>Try to reduce spending in your highest category</li>
                            <li>Set up payment reminders for all upcoming bills</li>
                            <li>Review and cancel any unused subscriptions</li>
                            <li>Consider consolidating similar bills</li>
                        </ul>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is an automated monthly summary from {{ app_name }}.</p>
                    <p>You're receiving this email because you have bills in our system.</p>
                    <p><a href="{{ app_url }}/unsubscribe">Unsubscribe from monthly summaries</a> | 
                       <a href="{{ app_url }}/preferences">Manage email preferences</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Render template
        from jinja2 import Template
        template = Template(html_template)
        
        html_content = template.render(
            user_name=user.username or user.email.split('@')[0],
            month_name=month_date.strftime('%B %Y'),
            total_bills=summary.get('total_bills', 0),
            total_amount=float(summary.get('total_amount', 0)),
            paid_bills=summary.get('paid_bills', 0),
            unpaid_bills=summary.get('unpaid_bills', 0),
            category_breakdown=summary.get('category_breakdown', []),
            app_name=settings.PROJECT_NAME,
            app_url=settings.FRONTEND_URL
        )
        
        return html_content

# Global instance
bill_reminder_service = BillReminderService()