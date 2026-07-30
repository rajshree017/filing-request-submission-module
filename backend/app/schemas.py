"""
Pydantic schemas — these define what the API accepts and returns,
and do the input validation FastAPI runs automatically before a
request ever touches the database layer.
"""

from datetime import datetime
from enum import Enum
from typing import List

from pydantic import BaseModel, Field, field_validator


class FilingStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    ACKNOWLEDGED = "acknowledged"


class FilingItem(BaseModel):
    """One line item within a filing (e.g. one product in the shipment)."""

    description: str = Field(..., min_length=1, max_length=200)
    quantity: int = Field(..., gt=0)
    unit_value: float = Field(..., ge=0)


class FilingBase(BaseModel):
    shipment_id: str = Field(..., min_length=1, max_length=50)
    invoice_no: str = Field(..., min_length=1, max_length=50)
    port: str = Field(..., min_length=1, max_length=100)
    value: float = Field(..., gt=0, description="Total invoice value")
    items: List[FilingItem] = Field(..., min_length=1)

    @field_validator("items")
    @classmethod
    def items_must_not_be_empty(cls, v):
        if not v:
            raise ValueError("A filing needs at least one item")
        return v


class FilingCreate(FilingBase):
    pass


class FilingUpdate(BaseModel):
    shipment_id: str | None = None
    invoice_no: str | None = None
    port: str | None = None
    value: float | None = Field(default=None, gt=0)
    items: List[FilingItem] | None = None
    status: FilingStatus | None = None


class FilingOut(FilingBase):
    id: str
    status: FilingStatus
    submission_date: datetime

    class Config:
        from_attributes = True
