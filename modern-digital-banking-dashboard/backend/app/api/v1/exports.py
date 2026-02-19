"""
Export APIs for CSV, PDF, and other formats
"""
import io
import csv
import json
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.account import Account
from app.schemas.export import (
    ExportRequest,
    ExportFormat,
    ExportType,
    ExportStatusResponse
)
from app.services.export_service import ExportService
from app.api.deps import get_current_active_user
from app.core.config import settings

router = APIRouter()

@router.post("/generate", response_model=ExportStatusResponse)
async def generate_export(
    export_request: ExportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate an export file (CSV, PDF, Excel)
    """
    export_service = ExportService(db, current_user.id)
    
    # Validate date range
    if export_request.start_date and export_request.end_date:
        if export_request.start_date > export_request.end_date:
            raise HTTPException(
                status_code=400,
                detail="start_date must be before end_date"
            )
        
        # Limit to 1 year for performance
        if (export_request.end_date - export_request.start_date).days > 365:
            raise HTTPException(
                status_code=400,
                detail="Export range cannot exceed 365 days"
            )
    
    # Generate export
    export_result = export_service.generate_export(export_request)
    
    return {
        "export_id": export_result["export_id"],
        "status": "processing",
        "message": "Export is being generated",
        "format": export_request.format.value,
        "type": export_request.export_type.value,
        "estimated_completion": datetime.now() + timedelta(seconds=30)
    }

@router.get("/download/{export_id}")
async def download_export(
    export_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Download generated export file
    """
    export_service = ExportService(db, current_user.id)
    
    export_data = export_service.get_export(export_id)
    
    if not export_data:
        raise HTTPException(
            status_code=404,
            detail="Export not found or expired"
        )
    
    # Check if user owns this export
    if export_data["user_id"] != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this export"
        )
    
    # Return file
    if export_data["format"] == ExportFormat.CSV:
        return StreamingResponse(
            io.StringIO(export_data["content"]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={export_data['filename']}"
            }
        )
    elif export_data["format"] == ExportFormat.JSON:
        return JSONResponse(
            content=json.loads(export_data["content"]),
            headers={
                "Content-Disposition": f"attachment; filename={export_data['filename']}"
            }
        )
    elif export_data["format"] == ExportFormat.PDF:
        # For PDF, we'd typically save to a file and serve it
        # This is a simplified version
        return StreamingResponse(
            io.BytesIO(export_data["content"].encode() if isinstance(export_data["content"], str) else export_data["content"]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={export_data['filename']}"
            }
        )

@router.get("/transactions/csv")
async def export_transactions_csv(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    account_id: Optional[int] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Direct CSV export of transactions (streaming response)
    """
    # Build query
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    
    if category:
        query = query.filter(Transaction.category == category)
    
    # Get transactions
    transactions = query.order_by(Transaction.date.desc()).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Date", "Description", "Category", "Amount", 
        "Type", "Account", "Status", "Notes"
    ])
    
    # Write data
    for transaction in transactions:
        writer.writerow([
            transaction.date.strftime("%Y-%m-%d"),
            transaction.description,
            transaction.category,
            f"{transaction.amount:.2f}",
            transaction.transaction_type.value,
            transaction.account.name if transaction.account else "",
            transaction.status.value,
            transaction.notes or ""
        ])
    
    # Return streaming response
    output.seek(0)
    filename = f"transactions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/summary/pdf")
async def export_summary_pdf(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Export financial summary as PDF
    """
    if not month or not year:
        now = datetime.now()
        month = month or now.month
        year = year or now.year
    
    export_service = ExportService(db, current_user.id)
    
    # Generate PDF summary
    pdf_content = export_service.generate_pdf_summary(month, year)
    
    if not pdf_content:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate PDF"
        )
    
    filename = f"financial_summary_{year}_{month:02d}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/cash-flow/report")
async def export_cash_flow_report(
    time_range: str = Query("month", regex="^(week|month|quarter|year)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Export detailed cash flow report
    """
    export_service = ExportService(db, current_user.id)
    
    report_data = export_service.generate_cash_flow_report(time_range)
    
    if not report_data:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate report"
        )
    
    # Return as JSON for this example
    # In production, this might generate PDF or Excel
    return {
        "report": report_data,
        "generated_at": datetime.now().isoformat(),
        "time_range": time_range,
        "format": "json"
    }

@router.get("/history")
async def get_export_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get history of user's exports
    """
    export_service = ExportService(db, current_user.id)
    
    history = export_service.get_export_history(skip, limit)
    
    return {
        "exports": history,
        "total": len(history),
        "skip": skip,
        "limit": limit
    }

@router.delete("/{export_id}")
async def delete_export(
    export_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete an export file
    """
    export_service = ExportService(db, current_user.id)
    
    deleted = export_service.delete_export(export_id, current_user.id)
    
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Export not found or already deleted"
        )
    
    return {"message": "Export deleted successfully"}

@router.get("/status/{export_id}")
async def get_export_status(
    export_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    export_service = ExportService(db, current_user.id)

    export_data = export_service.get_export(export_id)

    if not export_data:
        raise HTTPException(status_code=404, detail="Export not found")

    return {
        "export_id": export_id,
        "status": export_data.get("status", "completed"),
        "progress": export_data.get("progress", 100),
        "filename": export_data.get("filename"),
        "estimated_completion": export_data.get("estimated_completion"),
    }
