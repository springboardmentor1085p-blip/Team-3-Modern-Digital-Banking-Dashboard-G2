"""
Service for generating export files (CSV, PDF, Excel)
"""
import io
import csv
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from app.models.transaction import Transaction, TransactionType
from app.models.account import Account
from app.models.budget import Budget
from app.schemas.export import ExportRequest, ExportFormat, ExportType
from app.core.config import settings

EXPORT_CACHE: Dict[str, Dict[str, Any]] = {}

class ExportService:
    """Service for generating export files"""
    
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id          
    
    def generate_export(self, export_request: ExportRequest) -> Dict[str, Any]:
        """Generate an export file based on request"""
        export_id = str(uuid.uuid4())
        
        # Generate content based on export type and format
        if export_request.export_type == ExportType.TRANSACTIONS:
            content = self._generate_transactions_export(
                export_request.format,
                export_request.start_date,
                export_request.end_date,
                export_request.filters
            )
        elif export_request.export_type == ExportType.ACCOUNTS:
            content = self._generate_accounts_export(export_request.format)
        elif export_request.export_type == ExportType.CASH_FLOW:
            content = self._generate_cash_flow_export(
                export_request.format,
                export_request.start_date,
                export_request.end_date
            )
        elif export_request.export_type == ExportType.FINANCIAL_SUMMARY:
            content = self._generate_financial_summary_export(
                export_request.format,
                export_request.start_date,
                export_request.end_date
            )
        else:
            raise ValueError(f"Unsupported export type: {export_request.export_type}")
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{export_request.export_type.value}_{timestamp}"
        
        if export_request.format == ExportFormat.CSV:
            filename += ".csv"
        elif export_request.format == ExportFormat.PDF:
            filename += ".pdf"
        elif export_request.format == ExportFormat.EXCEL:
            filename += ".xlsx"
        elif export_request.format == ExportFormat.JSON:
            filename += ".json"
        
        # Store export metadata
        export_data = {
            "export_id": export_id,
            "user_id": self.user_id,
            "filename": filename,
            "format": export_request.format,
            "export_type": export_request.export_type,
            "content": content,

            # ✅ ADD THESE
            "status": "completed",        # since generation is synchronous
            "progress": 100,
            "estimated_completion": None,

            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(days=7),
            "download_count": 0
        }

        
        # Cache the export (in production, save to database or storage)
        EXPORT_CACHE[export_id] = export_data
        
        return export_data
    
    def get_export(self, export_id: str, increment_download: bool = False):
        export_data = EXPORT_CACHE.get(export_id)

        if not export_data:
            return None

        if export_data["expires_at"] < datetime.now():
            del EXPORT_CACHE[export_id]
            return None

        if increment_download:
            export_data["download_count"] += 1

        return export_data
    
    def delete_export(self, export_id: str, user_id: int) -> bool:
        """Delete an export file"""
        if export_id in EXPORT_CACHE:
            export_data = EXPORT_CACHE[export_id]
            if export_data["user_id"] == user_id:
                del EXPORT_CACHE[export_id]
                return True
        return False
    
    def get_export_history(self, skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        """Get user's export history"""
        user_exports = [
            export for export in EXPORT_CACHE.values()
            if export["user_id"] == self.user_id
        ]
        
        # Sort by creation date (newest first)
        user_exports.sort(key=lambda x: x["created_at"], reverse=True)
        
        return user_exports[skip:skip + limit]
    
    def _generate_transactions_export(
        self,
        format: ExportFormat,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> Any:
        """Generate transactions export"""
        # Build query
        query = self.db.query(Transaction).filter(Transaction.user_id == self.user_id)
        
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        
        if end_date:
            query = query.filter(Transaction.date <= end_date)
        
        # Apply filters
        if filters:
            if filters.get("account_ids"):
                query = query.filter(Transaction.account_id.in_(filters["account_ids"]))
            if filters.get("categories"):
                query = query.filter(Transaction.category.in_(filters["categories"]))
            if filters.get("min_amount"):
                query = query.filter(func.abs(Transaction.amount) >= filters["min_amount"])
            if filters.get("max_amount"):
                query = query.filter(func.abs(Transaction.amount) <= filters["max_amount"])
            if filters.get("transaction_types"):
                query = query.filter(Transaction.transaction_type.in_(filters["transaction_types"]))
            if filters.get("status"):
                query = query.filter(Transaction.status.in_(filters["status"]))
        
        transactions = query.order_by(Transaction.date.desc()).all()
        
        # Convert to desired format
        if format == ExportFormat.CSV:
            return self._transactions_to_csv(transactions)
        elif format == ExportFormat.JSON:
            return self._transactions_to_json(transactions)
        elif format == ExportFormat.PDF:
            return self._transactions_to_pdf(transactions, start_date, end_date)
        elif format == ExportFormat.EXCEL:
            return self._transactions_to_excel(transactions)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_accounts_export(self, format: ExportFormat) -> Any:
        """Generate accounts export"""
        accounts = self.db.query(Account).filter(
            Account.user_id == self.user_id,
            Account.is_active == True
        ).all()
        
        if format == ExportFormat.CSV:
            return self._accounts_to_csv(accounts)
        elif format == ExportFormat.JSON:
            return self._accounts_to_json(accounts)
        elif format == ExportFormat.PDF:
            return self._accounts_to_pdf(accounts)
        else:
            raise ValueError(f"Unsupported format for accounts export: {format}")
    
    def _generate_cash_flow_export(
        self,
        format: ExportFormat,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Any:
        """Generate cash flow report export"""
        if not start_date or not end_date:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
        
        # Get transactions
        transactions = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).order_by(Transaction.date).all()
        
        # Calculate cash flow data
        cash_flow_data = self._calculate_cash_flow_data(transactions, start_date, end_date)
        
        if format == ExportFormat.CSV:
            return self._cash_flow_to_csv(cash_flow_data)
        elif format == ExportFormat.JSON:
            return self._cash_flow_to_json(cash_flow_data)
        elif format == ExportFormat.PDF:
            return self._cash_flow_to_pdf(cash_flow_data, start_date, end_date)
        else:
            raise ValueError(f"Unsupported format for cash flow export: {format}")
    
    def _generate_financial_summary_export(
        self,
        format: ExportFormat,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Any:
        """Generate financial summary export"""
        if not start_date or not end_date:
            end_date = datetime.now()
            start_date = datetime(end_date.year, end_date.month, 1)
        
        # Get transactions
        transactions = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).all()
        
        # Calculate summary data
        summary_data = self._calculate_financial_summary(transactions, start_date, end_date)
        
        if format == ExportFormat.PDF:
            return self._financial_summary_to_pdf(summary_data, start_date, end_date)
        elif format == ExportFormat.JSON:
            return json.dumps(summary_data, indent=2, default=str)
        else:
            # For other formats, return JSON
            return json.dumps(summary_data, indent=2, default=str)
    
    # CSV Generation Methods
    def _transactions_to_csv(self, transactions: List[Transaction]) -> str:
        """Convert transactions to CSV format"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            "ID", "Date", "Description", "Category", "Amount",
            "Type", "Account", "Status", "Notes", "Tags"
        ])
        
        # Write data
        for transaction in transactions:
            writer.writerow([
                transaction.id,
                transaction.date.strftime("%Y-%m-%d"),
                transaction.description,
                transaction.category or "",
                f"{transaction.amount:.2f}",
                transaction.transaction_type.value,
                transaction.account.name if transaction.account else "",
                transaction.status.value,
                transaction.notes or "",
                ", ".join([tag.name for tag in transaction.tags]) if transaction.tags else ""
            ])
        
        return output.getvalue()
    
    def _accounts_to_csv(self, accounts: List[Account]) -> str:
        """Convert accounts to CSV format"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            "ID", "Name", "Type", "Balance", "Currency",
            "Limit", "Interest Rate", "Last Updated", "Status"
        ])
        
        # Write data
        for account in accounts:
            writer.writerow([
                account.id,
                account.name,
                account.account_type.value,
                f"{account.balance:.2f}",
                account.currency,
                f"{account.credit_limit:.2f}" if account.credit_limit else "",
                f"{account.interest_rate:.2f}%" if account.interest_rate else "",
                account.updated_at.strftime("%Y-%m-%d %H:%M:%S") if account.updated_at else "",
                "Active" if account.is_active else "Inactive"
            ])
        
        return output.getvalue()
    
    def _cash_flow_to_csv(self, cash_flow_data: Dict[str, Any]) -> str:
        """Convert cash flow data to CSV format"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write summary section
        writer.writerow(["CASH FLOW SUMMARY"])
        writer.writerow(["Period", cash_flow_data["period"]])
        writer.writerow(["Total Income", f"${cash_flow_data['total_income']:.2f}"])
        writer.writerow(["Total Expenses", f"${cash_flow_data['total_expenses']:.2f}"])
        writer.writerow(["Net Cash Flow", f"${cash_flow_data['net_cash_flow']:.2f}"])
        writer.writerow(["Savings Rate", f"{cash_flow_data['savings_rate']:.1f}%"])
        writer.writerow([])
        
        # Write category breakdown
        writer.writerow(["CATEGORY BREAKDOWN (Expenses)"])
        writer.writerow(["Category", "Amount", "Percentage", "Transaction Count"])
        
        for category in cash_flow_data.get("category_breakdown", []):
            writer.writerow([
                category["category"],
                f"${category['amount']:.2f}",
                f"{category['percentage']:.1f}%",
                category["transaction_count"]
            ])
        
        writer.writerow([])
        
        # Write transactions
        writer.writerow(["TRANSACTIONS"])
        writer.writerow(["Date", "Description", "Category", "Amount", "Type", "Account"])
        
        for transaction in cash_flow_data.get("transactions", []):
            writer.writerow([
                transaction["date"],
                transaction["description"],
                transaction["category"],
                f"${transaction['amount']:.2f}",
                transaction["type"],
                transaction["account"]
            ])
        
        return output.getvalue()
    
    # JSON Generation Methods
    def _transactions_to_json(self, transactions: List[Transaction]) -> str:
        """Convert transactions to JSON format"""
        transactions_data = []
        
        for transaction in transactions:
            transaction_data = {
                "id": transaction.id,
                "date": transaction.date.isoformat(),
                "description": transaction.description,
                "category": transaction.category,
                "amount": float(transaction.amount),
                "type": transaction.transaction_type.value,
                "account": transaction.account.name if transaction.account else None,
                "account_id": transaction.account_id,
                "status": transaction.status.value,
                "notes": transaction.notes,
                "tags": [tag.name for tag in transaction.tags] if transaction.tags else [],
                "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
                "updated_at": transaction.updated_at.isoformat() if transaction.updated_at else None
            }
            transactions_data.append(transaction_data)
        
        return json.dumps({
            "transactions": transactions_data,
            "count": len(transactions_data),
            "generated_at": datetime.now().isoformat()
        }, indent=2)
    
    def _accounts_to_json(self, accounts: List[Account]) -> str:
        """Convert accounts to JSON format"""
        accounts_data = []
        
        for account in accounts:
            account_data = {
                "id": account.id,
                "name": account.name,
                "type": account.account_type.value,
                "balance": float(account.balance),
                "currency": account.currency,
                "limit": float(account.credit_limit) if account.credit_limit else None,
                "interest_rate": float(account.interest_rate) if account.interest_rate else None,
                "is_active": account.is_active,
                "created_at": account.created_at.isoformat() if account.created_at else None,
                "updated_at": account.updated_at.isoformat() if account.updated_at else None
            }
            accounts_data.append(account_data)
        
        return json.dumps({
            "accounts": accounts_data,
            "count": len(accounts_data),
            "total_balance": sum(account.balance for account in accounts),
            "generated_at": datetime.now().isoformat()
        }, indent=2)
    
    def _cash_flow_to_json(self, cash_flow_data: Dict[str, Any]) -> str:
        """Convert cash flow data to JSON format"""
        return json.dumps(cash_flow_data, indent=2, default=str)
    
    # PDF Generation Methods
    def _transactions_to_pdf(
        self, 
        transactions: List[Transaction],
        start_date: Optional[datetime],
        end_date: Optional[datetime]
    ) -> bytes:
        """Convert transactions to PDF format"""
        buffer = io.BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        styles = getSampleStyleSheet()
        elements = []
        
        # Add title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30
        )
        
        elements.append(Paragraph("Transactions Report", title_style))
        
        # Add date range
        date_range = "All Transactions"
        if start_date and end_date:
            date_range = f"{start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}"
        elif start_date:
            date_range = f"From {start_date.strftime('%B %d, %Y')}"
        elif end_date:
            date_range = f"Through {end_date.strftime('%B %d, %Y')}"
        
        elements.append(Paragraph(f"Date Range: {date_range}", styles["Normal"]))
        elements.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y %I:%M %p')}", styles["Normal"]))
        elements.append(Spacer(1, 20))
        
        # Create summary table
        summary_data = self._calculate_transactions_summary(transactions)
        
        summary_table_data = [
            ["Total Transactions", str(len(transactions))],
            ["Total Income", f"${summary_data['total_income']:.2f}"],
            ["Total Expenses", f"${summary_data['total_expenses']:.2f}"],
            ["Net Cash Flow", f"${summary_data['net_cash_flow']:.2f}"]
        ]
        
        summary_table = Table(summary_table_data, colWidths=[200, 100])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(summary_table)
        elements.append(Spacer(1, 30))
        
        # Create transactions table (limit to 50 rows for PDF)
        display_transactions = transactions[:50]
        
        table_data = [["Date", "Description", "Category", "Amount", "Type"]]
        
        for transaction in display_transactions:
            table_data.append([
                transaction.date.strftime("%Y-%m-%d"),
                transaction.description[:50],  # Limit description length
                transaction.category or "",
                f"${transaction.amount:.2f}",
                transaction.transaction_type.value
            ])
        
        # Add note if transactions were truncated
        if len(transactions) > 50:
            table_data.append(["", f"... and {len(transactions) - 50} more transactions", "", "", ""])
        
        transactions_table = Table(table_data, colWidths=[60, 180, 80, 70, 60])
        transactions_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (3, 1), (3, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 8)
        ]))
        
        elements.append(transactions_table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return buffer.read()
    
    def _accounts_to_pdf(self, accounts: List[Account]) -> bytes:
        """Convert accounts to PDF format"""
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        styles = getSampleStyleSheet()
        elements = []
        
        # Add title
        elements.append(Paragraph("Accounts Summary", styles["Heading1"]))
        elements.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y %I:%M %p')}", styles["Normal"]))
        elements.append(Spacer(1, 20))
        
        # Create accounts table
        table_data = [["Account", "Type", "Balance", "Currency", "Status"]]
        
        total_balance = 0
        
        for account in accounts:
            table_data.append([
                account.name,
                account.account_type.value,
                f"${account.balance:.2f}",
                account.currency,
                "Active" if account.is_active else "Inactive"
            ])
            total_balance += account.balance
        
        # Add total row
        table_data.append(["", "TOTAL", f"${total_balance:.2f}", "", ""])
        
        accounts_table = Table(table_data, colWidths=[120, 80, 80, 60, 60])
        accounts_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(accounts_table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return buffer.read()
    
    def _cash_flow_to_pdf(
        self, 
        cash_flow_data: Dict[str, Any],
        start_date: datetime,
        end_date: datetime
    ) -> bytes:
        """Convert cash flow data to PDF format"""
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        styles = getSampleStyleSheet()
        elements = []
        
        # Add title
        elements.append(Paragraph("Cash Flow Report", styles["Heading1"]))
        elements.append(Paragraph(
            f"Period: {start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}",
            styles["Normal"]
        ))
        elements.append(Paragraph(
            f"Generated: {datetime.now().strftime('%B %d, %Y %I:%M %p')}",
            styles["Normal"]
        ))
        elements.append(Spacer(1, 20))
        
        # Add summary
        summary_data = [
            ["Metric", "Amount"],
            ["Total Income", f"${cash_flow_data['total_income']:.2f}"],
            ["Total Expenses", f"${cash_flow_data['total_expenses']:.2f}"],
            ["Net Cash Flow", f"${cash_flow_data['net_cash_flow']:.2f}"],
            ["Savings Rate", f"{cash_flow_data['savings_rate']:.1f}%"]
        ]
        
        summary_table = Table(summary_data, colWidths=[200, 100])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(summary_table)
        elements.append(Spacer(1, 30))
        
        # Add category breakdown
        elements.append(Paragraph("Category Breakdown (Expenses)", styles["Heading2"]))
        elements.append(Spacer(1, 10))
        
        if cash_flow_data.get("category_breakdown"):
            category_data = [["Category", "Amount", "Percentage", "Count"]]
            
            for category in cash_flow_data["category_breakdown"][:10]:  # Top 10 categories
                category_data.append([
                    category["category"],
                    f"${category['amount']:.2f}",
                    f"{category['percentage']:.1f}%",
                    str(category["transaction_count"])
                ])
            
            category_table = Table(category_data, colWidths=[150, 80, 80, 60])
            category_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 1), (2, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            elements.append(category_table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return buffer.read()
    
    def _financial_summary_to_pdf(
        self,
        summary_data: Dict[str, Any],
        start_date: datetime,
        end_date: datetime
    ) -> bytes:
        """Generate financial summary PDF"""
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        styles = getSampleStyleSheet()
        elements = []
        
        # Add title and header
        elements.append(Paragraph("Financial Summary Report", styles["Title"]))
        elements.append(Paragraph(
            f"Period: {start_date.strftime('%B %Y')} to {end_date.strftime('%B %Y')}",
            styles["Heading3"]
        ))
        elements.append(Paragraph(
            f"Generated: {datetime.now().strftime('%B %d, %Y')}",
            styles["Normal"]
        ))
        elements.append(Spacer(1, 30))
        
        # Add key metrics
        elements.append(Paragraph("Key Financial Metrics", styles["Heading2"]))
        
        metrics_data = [
            ["Metric", "Value", "Trend"],
            ["Net Worth", f"${summary_data.get('net_worth', 0):,.2f}", summary_data.get('net_worth_trend', '→')],
            ["Monthly Income", f"${summary_data.get('avg_monthly_income', 0):,.2f}", summary_data.get('income_trend', '→')],
            ["Monthly Expenses", f"${summary_data.get('avg_monthly_expenses', 0):,.2f}", summary_data.get('expenses_trend', '→')],
            ["Savings Rate", f"{summary_data.get('savings_rate', 0):.1f}%", summary_data.get('savings_trend', '→')],
            ["Debt-to-Income", f"{summary_data.get('debt_to_income', 0):.1f}%", summary_data.get('debt_trend', '→')]
        ]
        
        metrics_table = Table(metrics_data, colWidths=[150, 100, 60])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('ALIGN', (2, 1), (2, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ecf0f1')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#bdc3c7'))
        ]))
        
        elements.append(metrics_table)
        elements.append(Spacer(1, 30))
        
        # Add recommendations
        if summary_data.get("recommendations"):
            elements.append(Paragraph("Financial Recommendations", styles["Heading2"]))
            
            for i, recommendation in enumerate(summary_data["recommendations"][:5], 1):
                elements.append(Paragraph(f"{i}. {recommendation}", styles["Normal"]))
        
        # Add footer
        elements.append(Spacer(1, 50))
        elements.append(Paragraph(
            "This report is generated for informational purposes only. "
            "Consult with a financial advisor for personalized advice.",
            ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=8,
                textColor=colors.grey
            )
        ))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return buffer.read()
    
    # Helper Methods
    def _calculate_transactions_summary(self, transactions: List[Transaction]) -> Dict[str, float]:
        """Calculate summary statistics for transactions"""
        total_income = sum(
            t.amount for t in transactions 
            if t.transaction_type == TransactionType.INCOME
        )
        total_expenses = sum(
            abs(t.amount) for t in transactions 
            if t.transaction_type == TransactionType.EXPENSE
        )
        net_cash_flow = total_income - total_expenses
        
        return {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_cash_flow": net_cash_flow
        }
    
    def _calculate_cash_flow_data(
        self, 
        transactions: List[Transaction],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate cash flow data for export"""
        total_income = sum(
            t.amount for t in transactions 
            if t.transaction_type == TransactionType.INCOME
        )
        total_expenses = sum(
            abs(t.amount) for t in transactions 
            if t.transaction_type == TransactionType.EXPENSE
        )
        net_cash_flow = total_income - total_expenses
        
        # Calculate savings rate
        savings_rate = 0
        if total_income > 0:
            savings_rate = (net_cash_flow / total_income) * 100
        
        # Calculate category breakdown
        category_totals = {}
        category_counts = {}
        
        for transaction in transactions:
            if transaction.transaction_type == TransactionType.EXPENSE:
                category = transaction.category or "Uncategorized"
                amount = abs(transaction.amount)
                
                if category not in category_totals:
                    category_totals[category] = 0
                    category_counts[category] = 0
                
                category_totals[category] += amount
                category_counts[category] += 1
        
        category_breakdown = []
        for category, amount in category_totals.items():
            percentage = (amount / total_expenses * 100) if total_expenses > 0 else 0
            category_breakdown.append({
                "category": category,
                "amount": amount,
                "percentage": percentage,
                "transaction_count": category_counts[category]
            })
        
        # Sort categories by amount (descending)
        category_breakdown.sort(key=lambda x: x["amount"], reverse=True)
        
        # Prepare transaction data for export
        transaction_data = []
        for transaction in transactions:
            transaction_data.append({
                "date": transaction.date.strftime("%Y-%m-%d"),
                "description": transaction.description,
                "category": transaction.category or "",
                "amount": float(transaction.amount),
                "type": transaction.transaction_type.value,
                "account": transaction.account.name if transaction.account else ""
            })
        
        return {
            "period": f"{start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}",
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_cash_flow": net_cash_flow,
            "savings_rate": savings_rate,
            "category_breakdown": category_breakdown,
            "transactions": transaction_data,
            "transaction_count": len(transactions),
            "generated_at": datetime.now().isoformat()
        }
    
    def _calculate_financial_summary(
        self,
        transactions: List[Transaction],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate comprehensive financial summary"""
        # Calculate basic metrics
        income_transactions = [
            t for t in transactions 
            if t.transaction_type == TransactionType.INCOME
        ]
        expense_transactions = [
            t for t in transactions 
            if t.transaction_type == TransactionType.EXPENSE
        ]
        
        total_income = sum(t.amount for t in income_transactions)
        total_expenses = sum(abs(t.amount) for t in expense_transactions)
        net_cash_flow = total_income - total_expenses
        
        # Calculate savings rate
        savings_rate = 0
        if total_income > 0:
            savings_rate = (net_cash_flow / total_income) * 100
        
        # Calculate category breakdown
        category_expenses = {}
        for transaction in expense_transactions:
            category = transaction.category or "Uncategorized"
            if category not in category_expenses:
                category_expenses[category] = 0
            category_expenses[category] += abs(transaction.amount)
        
        top_categories = sorted(
            category_expenses.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        # Calculate trends (simplified)
        # In a real implementation, you would compare with previous periods
        
        # Generate recommendations
        recommendations = []
        
        if savings_rate < 10:
            recommendations.append(
                "Consider increasing your savings rate to at least 10% for better financial security."
            )
        
        if total_expenses > total_income * 0.8:
            recommendations.append(
                "Your expenses are high relative to your income. Consider reviewing your spending habits."
            )
        
        if len(top_categories) > 0 and top_categories[0][1] > total_expenses * 0.3:
            recommendations.append(
                f"Your spending on '{top_categories[0][0]}' is quite high. "
                f"Consider setting a budget for this category."
            )
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "metrics": {
                "total_income": total_income,
                "total_expenses": total_expenses,
                "net_cash_flow": net_cash_flow,
                "savings_rate": savings_rate,
                "income_transactions": len(income_transactions),
                "expense_transactions": len(expense_transactions)
            },
            "top_categories": [
                {"category": cat, "amount": amt} for cat, amt in top_categories
            ],
            "recommendations": recommendations,
            "generated_at": datetime.now().isoformat()
        }
    
    def _transactions_to_excel(self, transactions: List[Transaction]) -> bytes:
        """Convert transactions to Excel format"""
        # This would use pandas to create an Excel file
        # For now, returning CSV as placeholder
        return self._transactions_to_csv(transactions).encode('utf-8')
    
    def generate_pdf_summary(self, month: int, year: int) -> Optional[bytes]:
        """Generate PDF summary for a specific month"""
        try:
            month_start = datetime(year, month, 1)
            if month == 12:
                month_end = datetime(year, 12, 31)
            else:
                month_end = datetime(year, month + 1, 1) - timedelta(days=1)
            
            # Get transactions for the month
            transactions = self.db.query(Transaction).filter(
                Transaction.user_id == self.user_id,
                Transaction.date >= month_start,
                Transaction.date <= month_end,
                Transaction.status == "completed"
            ).all()
            
            # Generate PDF
            return self._financial_summary_to_pdf(
                self._calculate_financial_summary(transactions, month_start, month_end),
                month_start,
                month_end
            )
        except Exception as e:
            print(f"Error generating PDF summary: {e}")
            return None
    
    def generate_cash_flow_report(self, time_range: str) -> Dict[str, Any]:
        """Generate cash flow report"""
        end_date = datetime.now()
        
        if time_range == "week":
            start_date = end_date - timedelta(days=7)
        elif time_range == "month":
            start_date = datetime(end_date.year, end_date.month, 1)
        elif time_range == "quarter":
            quarter = (end_date.month - 1) // 3 + 1
            start_month = (quarter - 1) * 3 + 1
            start_date = datetime(end_date.year, start_month, 1)
        elif time_range == "year":
            start_date = datetime(end_date.year, 1, 1)
        else:
            start_date = end_date - timedelta(days=30)
        
        # Get transactions
        transactions = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.status == "completed"
        ).all()
        
        return self._calculate_cash_flow_data(transactions, start_date, end_date)