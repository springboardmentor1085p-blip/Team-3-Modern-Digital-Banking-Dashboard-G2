"""
Export Pydantic schemas
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum

class ExportFormat(str, Enum):
    """Export file formats"""
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "excel"
    JSON = "json"

class ExportType(str, Enum):
    """Types of exports"""
    TRANSACTIONS = "transactions"
    ACCOUNTS = "accounts"
    BUDGETS = "budgets"
    CATEGORIES = "categories"
    CASH_FLOW = "cash_flow"
    FINANCIAL_SUMMARY = "financial_summary"
    TAX_REPORT = "tax_report"
    AUDIT_LOG = "audit_log"
    ALERTS = "alerts"

class ExportStatus(str, Enum):
    """Export status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"

# Request schemas
class ExportRequest(BaseModel):
    """Request to generate an export"""
    export_type: ExportType
    format: ExportFormat = ExportFormat.CSV
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    filters: Optional[Dict[str, Any]] = None
    include_charts: bool = False
    password_protect: bool = False
    custom_filename: Optional[str] = None
    
    @validator('custom_filename')
    def validate_filename(cls, v):
        if v:
            # Basic filename validation
            if len(v) > 100:
                raise ValueError('Filename too long')
            if any(char in v for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']):
                raise ValueError('Invalid characters in filename')
        return v
    
    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and values['start_date'] and v:
            if v < values['start_date']:
                raise ValueError('end_date must be after start_date')
        return v

class ExportFilter(BaseModel):
    """Filters for exports"""
    account_ids: Optional[List[int]] = None
    categories: Optional[List[str]] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    transaction_types: Optional[List[str]] = None
    status: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    
    class Config:
        use_enum_values = True

# Response schemas
class ExportStatusResponse(BaseModel):
    """Export generation status"""
    export_id: str
    status: ExportStatus
    message: str
    format: str
    type: str
    estimated_completion: Optional[datetime] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    expires_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ExportMetadata(BaseModel):
    """Export file metadata"""
    export_id: str
    user_id: int
    filename: str
    format: ExportFormat
    export_type: ExportType
    file_size: int
    created_at: datetime
    expires_at: datetime
    download_count: int
    checksum: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ExportHistoryResponse(BaseModel):
    """Export history response"""
    exports: List[ExportMetadata]
    total: int
    skip: int
    limit: int

# Column configuration
class ExportColumnConfig(BaseModel):
    """Column configuration for exports"""
    column_name: str
    display_name: str
    include: bool = True
    width: Optional[int] = None
    format: Optional[str] = None  # e.g., "currency", "date", "percentage"
    
    @validator('format')
    def validate_format(cls, v):
        if v and v not in ['currency', 'date', 'datetime', 'percentage', 'number', 'text']:
            raise ValueError('Invalid format type')
        return v

class ExportTemplate(BaseModel):
    """Export template configuration"""
    template_id: str
    name: str
    description: Optional[str] = None
    export_type: ExportType
    format: ExportFormat
    columns: List[ExportColumnConfig]
    default_filters: Optional[Dict[str, Any]] = None
    include_summary: bool = True
    include_header: bool = True
    
    @validator('template_id')
    def validate_template_id(cls, v):
        if not v.replace('_', '').isalnum():
            raise ValueError('Template ID must be alphanumeric')
        return v

# Bulk export
class BulkExportRequest(BaseModel):
    """Request for bulk exports"""
    exports: List[ExportRequest]
    compress: bool = True
    notification_email: Optional[str] = None
    
    @validator('exports')
    def validate_exports(cls, v):
        if len(v) > 5:
            raise ValueError('Maximum 5 exports per bulk request')
        return v

# PDF-specific
class PDFOptions(BaseModel):
    """PDF export options"""
    orientation: str = Field("portrait", pattern="^(portrait|landscape)$")
    page_size: str = Field("A4", pattern="^(A3|A4|Letter|Legal)$")
    include_logo: bool = True
    include_page_numbers: bool = True
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    watermark: Optional[str] = None
    password: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if v and len(v) < 4:
            raise ValueError('Password must be at least 4 characters')
        return v

# Excel-specific
class ExcelOptions(BaseModel):
    """Excel export options"""
    include_charts: bool = False
    include_formulas: bool = True
    freeze_header: bool = True
    auto_filter: bool = True
    multiple_sheets: bool = False
    sheet_names: Optional[Dict[str, str]] = None