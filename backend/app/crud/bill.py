from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, extract, desc, asc
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.models.bill import Bill
from app.schemas.bill import BillCreate, BillUpdate, BillFrequency, CurrencyCode

class CRUDBill:
    def __init__(self, model):
        self.model = model
    
    def get(self, db: Session, id: int) -> Optional[Bill]:
        """Get a bill by ID"""
        return db.query(self.model).filter(self.model.id == id).first()
    
    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict] = None
    ) -> List[Bill]:
        """Get multiple bills with optional filtering"""
        query = db.query(self.model)
        
        if filters:
            # Apply user_id filter if present
            if 'user_id' in filters:
                query = query.filter(self.model.user_id == filters['user_id'])
            
            # Apply category filter
            if 'category' in filters and filters['category']:
                query = query.filter(self.model.category == filters['category'])
            
            # Apply is_paid filter
            if 'is_paid' in filters and filters['is_paid'] is not None:
                query = query.filter(self.model.is_paid == filters['is_paid'])
            
            # Apply date range filter
            if 'start_date' in filters and 'end_date' in filters:
                if filters['start_date'] and filters['end_date']:
                    query = query.filter(
                        self.model.due_date >= filters['start_date'],
                        self.model.due_date <= filters['end_date']
                    )
            
            # Apply amount range filter
            if 'min_amount' in filters and filters['min_amount']:
                query = query.filter(self.model.amount_usd >= filters['min_amount'])
            if 'max_amount' in filters and filters['max_amount']:
                query = query.filter(self.model.amount_usd <= filters['max_amount'])
            
            # Apply frequency filter
            if 'frequency' in filters and filters['frequency']:
                query = query.filter(self.model.frequency == filters['frequency'])
        
        # Order by due date (ascending for upcoming bills)
        query = query.order_by(asc(self.model.due_date), desc(self.model.created_at))
        
        return query.offset(skip).limit(limit).all()
    
    def create(self, db: Session, obj_in: Dict[str, Any], user_id: int) -> Bill:
        """Create a new bill"""
        db_obj = self.model(
            **obj_in,
            user_id=user_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, db_obj: Bill, obj_in: Dict[str, Any]) -> Bill:
        """Update a bill"""
        update_data = obj_in.copy()
        
        # Update paid_date if marking as paid
        if 'is_paid' in update_data and update_data['is_paid'] and not db_obj.paid_date:
            update_data['paid_date'] = date.today()
        elif 'is_paid' in update_data and not update_data['is_paid']:
            update_data['paid_date'] = None
        
        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def remove(self, db: Session, id: int) -> Bill:
        """Delete a bill"""
        obj = db.query(self.model).get(id)
        db.delete(obj)
        db.commit()
        return obj
    
    def mark_as_paid(self, db: Session, db_obj: Bill) -> Bill:
        """Mark a bill as paid"""
        db_obj.is_paid = True
        db_obj.paid_date = date.today()
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def mark_as_unpaid(self, db: Session, db_obj: Bill) -> Bill:
        """Mark a bill as unpaid"""
        db_obj.is_paid = False
        db_obj.paid_date = None
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_due_soon(
        self, 
        db: Session, 
        user_id: int, 
        start_date: date, 
        end_date: date,
        include_overdue: bool = True
    ) -> List[Bill]:
        """Get bills due within a date range"""
        query = db.query(self.model).filter(
            self.model.user_id == user_id,
            self.model.is_paid == False
        )
        
        if include_overdue:
            # Include overdue bills and bills due in the range
            query = query.filter(
                or_(
                    self.model.due_date < start_date,  # Overdue
                    and_(
                        self.model.due_date >= start_date,
                        self.model.due_date <= end_date
                    )
                )
            )
        else:
            # Only bills due in the range
            query = query.filter(
                self.model.due_date >= start_date,
                self.model.due_date <= end_date
            )
        
        return query.order_by(asc(self.model.due_date)).all()
    
    def get_overdue(self, db: Session, user_id: Optional[int] = None) -> List[Bill]:
        """Get all overdue bills"""
        query = db.query(self.model).filter(
            self.model.is_paid == False,
            self.model.due_date < date.today()
        )
        
        if user_id:
            query = query.filter(self.model.user_id == user_id)
        
        return query.order_by(asc(self.model.due_date)).all()
    
    def get_monthly_summary(
        self, 
        db: Session, 
        user_id: int, 
        month: int, 
        year: int
    ) -> Dict[str, Any]:
        """Get monthly bill summary"""
        # Get bills for the month
        bills = db.query(self.model).filter(
            self.model.user_id == user_id,
            extract('month', self.model.due_date) == month,
            extract('year', self.model.due_date) == year
        ).all()
        
        # Calculate totals
        total_amount = sum(float(bill.amount_usd) for bill in bills)
        paid_bills = [b for b in bills if b.is_paid]
        unpaid_bills = [b for b in bills if not b.is_paid]
        
        # Calculate category breakdown
        category_breakdown = {}
        for bill in bills:
            if bill.category not in category_breakdown:
                category_breakdown[bill.category] = {
                    'total_amount': 0,
                    'bill_count': 0,
                    'paid_count': 0,
                    'unpaid_count': 0
                }
            
            breakdown = category_breakdown[bill.category]
            breakdown['total_amount'] += float(bill.amount_usd)
            breakdown['bill_count'] += 1
            
            if bill.is_paid:
                breakdown['paid_count'] += 1
            else:
                breakdown['unpaid_count'] += 1
        
        # Convert to list format
        category_list = [
            {
                'category': category,
                'total_amount': Decimal(str(data['total_amount'])),
                'bill_count': data['bill_count'],
                'paid_count': data['paid_count'],
                'unpaid_count': data['unpaid_count']
            }
            for category, data in category_breakdown.items()
        ]
        
        return {
            'total_bills': len(bills),
            'total_amount': Decimal(str(total_amount)),
            'paid_bills': len(paid_bills),
            'unpaid_bills': len(unpaid_bills),
            'category_breakdown': category_list
        }
    
    def get_yearly_analytics(self, db: Session, user_id: int, year: int) -> Dict[str, Any]:
        """Get yearly bill analytics"""
        # Get monthly totals
        monthly_data = db.query(
            extract('month', self.model.due_date).label('month'),
            func.sum(self.model.amount_usd).label('total_amount'),
            func.count(self.model.id).label('bill_count'),
            func.sum(func.case((self.model.is_paid == True, self.model.amount_usd), else_=0)).label('paid_amount'),
            func.sum(func.case((self.model.is_paid == False, self.model.amount_usd), else_=0)).label('unpaid_amount')
        ).filter(
            self.model.user_id == user_id,
            extract('year', self.model.due_date) == year
        ).group_by(
            extract('month', self.model.due_date)
        ).order_by('month').all()
        
        # Get category breakdown
        category_data = db.query(
            self.model.category,
            func.sum(self.model.amount_usd).label('total_amount'),
            func.count(self.model.id).label('bill_count')
        ).filter(
            self.model.user_id == user_id,
            extract('year', self.model.due_date) == year
        ).group_by(self.model.category).all()
        
        return {
            'monthly_breakdown': [
                {
                    'month': int(row.month),
                    'total_amount': row.total_amount or Decimal('0'),
                    'bill_count': row.bill_count or 0,
                    'paid_amount': row.paid_amount or Decimal('0'),
                    'unpaid_amount': row.unpaid_amount or Decimal('0')
                }
                for row in monthly_data
            ],
            'category_breakdown': [
                {
                    'category': row.category,
                    'total_amount': row.total_amount or Decimal('0'),
                    'bill_count': row.bill_count or 0
                }
                for row in category_data
            ]
        }
    
    def get_upcoming_recurring_bills(self, db: Session, user_id: int) -> List[Bill]:
        """Get upcoming recurring bills"""
        today = date.today()
        next_month = today + timedelta(days=30)
        
        return db.query(self.model).filter(
            self.model.user_id == user_id,
            self.model.frequency != 'one_time',
            self.model.due_date >= today,
            self.model.due_date <= next_month
        ).order_by(asc(self.model.due_date)).all()
    
    def get_bills_for_reminder(self, db: Session, reminder_days: int = 3) -> List[Bill]:
        """Get bills that need reminders"""
        today = date.today()
        reminder_date = today + timedelta(days=reminder_days)
        
        return db.query(self.model).filter(
            self.model.is_paid == False,
            self.model.due_date == reminder_date
        ).all()

bill_crud = CRUDBill(Bill)