import logging
from celery import Task
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.alert_service import AlertService
from app.crud.alert import CRUDAlert
from app.models.alert import Alert

logger = logging.getLogger(__name__)

class DatabaseTask(Task):
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        if self._db is not None:
            self._db.close()
            self._db = None

@celery_app.task(base=DatabaseTask, bind=True, name="app.workers.alert_tasks.generate_alerts_for_all_users")
def generate_alerts_for_all_users(self):
    """Generate alerts for all active users"""
    logger.info("Starting alert generation for all users")
    
    db = self.db
    from app.models.user import User
    
    try:
        # Get all active users
        users = db.query(User).filter(User.is_active == True).all()
        
        total_alerts = 0
        for user in users:
            try:
                alert_service = AlertService(db, user.id)
                alerts = alert_service.check_and_generate_alerts()
                total_alerts += len(alerts)
                logger.info(f"Generated {len(alerts)} alerts for user {user.id}")
            except Exception as e:
                logger.error(f"Error generating alerts for user {user.id}: {str(e)}")
        
        logger.info(f"Completed alert generation. Total alerts: {total_alerts}")
        return {"status": "success", "total_alerts": total_alerts, "users_processed": len(users)}
    
    except Exception as e:
        logger.error(f"Error in alert generation task: {str(e)}")
        return {"status": "error", "error": str(e)}

@celery_app.task(base=DatabaseTask, bind=True, name="app.workers.alert_tasks.cleanup_expired_alerts")
def cleanup_expired_alerts(self):
    """Clean up expired alerts"""
    logger.info("Starting expired alerts cleanup")
    
    db = self.db
    crud_alert = CRUDAlert(Alert)
    
    try:
        # Get all users
        from app.models.user import User
        users = db.query(User).filter(User.is_active == True).all()
        
        total_cleaned = 0
        for user in users:
            try:
                cleaned = crud_alert.cleanup_expired(db, user_id=user.id)
                total_cleaned += cleaned
                logger.info(f"Cleaned {cleaned} expired alerts for user {user.id}")
            except Exception as e:
                logger.error(f"Error cleaning alerts for user {user.id}: {str(e)}")
        
        logger.info(f"Completed alerts cleanup. Total cleaned: {total_cleaned}")
        return {"status": "success", "total_cleaned": total_cleaned}
    
    except Exception as e:
        logger.error(f"Error in alerts cleanup task: {str(e)}")
        return {"status": "error", "error": str(e)}

@celery_app.task(base=DatabaseTask, bind=True, name="app.workers.alert_tasks.cleanup_old_exports")
def cleanup_old_exports(self):
    """Clean up old export files"""
    logger.info("Starting old exports cleanup")
    
    # This would integrate with your export service
    # For now, just log the task
    logger.info("Export cleanup task completed")
    
    return {"status": "success", "message": "Export cleanup completed"}

@celery_app.task(bind=True, name="app.workers.alert_tasks.send_alert_notifications")
def send_alert_notifications(self, alert_ids, user_id):
    """Send notifications for generated alerts"""
    logger.info(f"Sending notifications for {len(alert_ids)} alerts to user {user_id}")
    
    # This would integrate with email/SMS/push notification services
    # For now, just log the task
    
    return {"status": "success", "alerts_processed": len(alert_ids)}