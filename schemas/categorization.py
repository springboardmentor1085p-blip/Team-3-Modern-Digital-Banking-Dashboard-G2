from pydantic import BaseModel, Field, validator
from datetime import date, datetime
from typing import Optional, List, Dict
from enum import Enum


class PatternType(str, Enum):
    CONTAINS = "contains"
    REGEX = "regex"
    EXACT = "exact"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"


class CategoryRuleBase(BaseModel):
    rule_name: str = Field(..., min_length=1, max_length=100)
    pattern_type: PatternType = PatternType.CONTAINS
    pattern: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., min_length=1, max_length=50)
    subcategory: Optional[str] = Field(None, max_length=50)
    priority: int = Field(default=1, ge=1, le=10)
    is_active: bool = True
    
    @validator('pattern')
    def validate_regex_pattern(cls, v, values):
        if values.get('pattern_type') == PatternType.REGEX:
            import re
            try:
                re.compile(v)
            except re.error:
                raise ValueError('Invalid regular expression pattern')
        return v


class CategoryRuleCreate(CategoryRuleBase):
    pass


class CategoryRuleResponse(CategoryRuleBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        form_attributes = True


class AutoCategorizeRequest(BaseModel):
    transaction_ids: Optional[List[int]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    @validator('end_date')
    def validate_dates(cls, v, values):
        if v and values.get('start_date') and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class AutoCategorizeResponse(BaseModel):
    categorized_count: int
    uncategorized_count: int
    details: List[Dict[str, str]]


class TransactionCategoryUpdate(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    subcategory: Optional[str] = Field(None, max_length=50)


class CategorySuggestion(BaseModel):
    category: str
    subcategory: Optional[str]
    confidence: float
    matched_rule: Optional[str]


class CategoryStatistics(BaseModel):
    category: str
    total_amount: float
    transaction_count: int
    percentage_of_total: float
    avg_transaction_amount: float