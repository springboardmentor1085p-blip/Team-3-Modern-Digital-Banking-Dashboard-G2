from datetime import datetime
from typing import Any

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings


# --------------------------------------------------
# Celery Instance
# --------------------------------------------------
celery_app = Celery(
    "banking_worker",
    broker=getattr(settings, "CELERY_BROKER_URL", settings.REDIS_URL),
    backend=getattr(settings, "CELERY_RESULT_BACKEND", settings.REDIS_URL),
    include=[
        "app.workers.bill_tasks",
        "app.workers.alert_tasks",
    ],
)


# --------------------------------------------------
# Core Configuration
# --------------------------------------------------
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=20 * 60,
    worker_max_tasks_per_child=500,
    worker_prefetch_multiplier=1,
)


# --------------------------------------------------
# Beat Schedule (Merged M3 + M4 Jobs)
# --------------------------------------------------
celery_app.conf.beat_schedule = {

    # ---------------- Bills ----------------
    "send-daily-reminders": {
        "task": "app.workers.bill_tasks.send_daily_reminders",
        "schedule": crontab(hour=8, minute=0),
        "options": {"queue": "reminders"},
    },

    "send-overdue-reminders": {
        "task": "app.workers.bill_tasks.send_overdue_reminders",
        "schedule": crontab(hour=12, minute=0),
        "options": {"queue": "reminders"},
    },

    "process-recurring-bills": {
        "task": "app.workers.bill_tasks.process_recurring_bills",
        "schedule": crontab(hour=6, minute=0),
        "options": {"queue": "bills"},
    },

    "check-bills-daily": {
        "task": "app.workers.bill_tasks.check_bills_due",
        "schedule": crontab(hour=9, minute=0),
        "options": {"queue": "bills"},
    },

    # ---------------- Reports ----------------
    "send-weekly-summaries": {
        "task": "app.workers.bill_tasks.send_weekly_summaries",
        "schedule": crontab(day_of_week=1, hour=9, minute=0),
        "options": {"queue": "reports"},
    },

    "send-monthly-summaries": {
        "task": "app.workers.bill_tasks.send_monthly_summaries",
        "schedule": crontab(day_of_month=1, hour=10, minute=0),
        "options": {"queue": "reports"},
    },

    "generate-monthly-analytics": {
        "task": "app.workers.bill_tasks.generate_monthly_analytics",
        "schedule": crontab(day_of_month="last", hour=23, minute=0),
        "options": {"queue": "analytics"},
    },

    # ---------------- Alerts ----------------
    "generate-alerts-hourly": {
        "task": "app.workers.alert_tasks.generate_alerts_for_all_users",
        "schedule": crontab(minute=0),
        "options": {"queue": "alerts"},
    },

    "cleanup-expired-alerts": {
        "task": "app.workers.alert_tasks.cleanup_expired_alerts",
        "schedule": crontab(hour=2, minute=0),
        "options": {"queue": "maintenance"},
    },

    "cleanup-old-notifications": {
        "task": "app.workers.bill_tasks.cleanup_old_notifications",
        "schedule": crontab(hour=2, minute=30),
        "options": {"queue": "maintenance"},
    },

    # ---------------- Maintenance ----------------
    "cleanup-old-exports": {
        "task": "app.workers.alert_tasks.cleanup_old_exports",
        "schedule": crontab(hour=3, minute=30),
        "options": {"queue": "maintenance"},
    },

    "update-exchange-rates": {
        "task": "app.workers.bill_tasks.update_exchange_rates",
        "schedule": crontab(hour="*/6", minute=0),
        "options": {"queue": "maintenance"},
    },
}


# --------------------------------------------------
# Routing
# --------------------------------------------------
celery_app.conf.task_routes = {
    "app.workers.bill_tasks.*": {"queue": "bills"},
    "app.workers.alert_tasks.*": {"queue": "alerts"},
}


# --------------------------------------------------
# Reliability
# --------------------------------------------------
celery_app.conf.task_acks_late = True
celery_app.conf.task_reject_on_worker_lost = True
celery_app.conf.worker_cancel_long_running_tasks_on_connection_loss = True


# --------------------------------------------------
# Result Backend
# --------------------------------------------------
celery_app.conf.result_expires = 3600
celery_app.conf.result_persistent = True


# --------------------------------------------------
# Monitoring
# --------------------------------------------------
celery_app.conf.worker_send_task_events = True
celery_app.conf.task_send_sent_event = True


# --------------------------------------------------
# Logger Utility
# --------------------------------------------------
class CeleryTaskLogger:

    @staticmethod
    def log_task_start(task_name: str, task_id: str, **kwargs):
        print(f"[{task_id}] Starting task: {task_name}")
        if kwargs:
            print(f"[{task_id}] Args:", kwargs)

    @staticmethod
    def log_task_success(task_name: str, task_id: str, result: Any = None):
        print(f"[{task_id}] {task_name} completed")
        if result is not None:
            print(f"[{task_id}] Result:", result)

    @staticmethod
    def log_task_failure(task_name: str, task_id: str, error: Exception):
        print(f"[{task_id}] {task_name} failed:", str(error))

    @staticmethod
    def log_task_retry(task_name: str, task_id: str, retry_count: int):
        print(f"[{task_id}] {task_name} retry #{retry_count}")


task_logger = CeleryTaskLogger()


# --------------------------------------------------
# Health Check Task
# --------------------------------------------------
@celery_app.task(bind=True)
def health_check(self):
    return {
        "status": "healthy",
        "worker": self.request.hostname,
        "timestamp": datetime.utcnow().isoformat(),
    }


# --------------------------------------------------
# Factory
# --------------------------------------------------
def create_celery_app():
    return celery_app


print("Celery initialized with broker:", celery_app.conf.broker_url)
