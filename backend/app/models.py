"""
ORM model for a customs Filing.

A Filing represents one shipment's customs declaration submission —
what a broker fills in and sends off for a shipment's invoice + items.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Float, String, Text
from sqlalchemy.sql import func

from .database import Base


class FilingStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    ACKNOWLEDGED = "acknowledged"


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Filing(Base):
    __tablename__ = "filings"

    id = Column(String, primary_key=True, default=generate_uuid)
    shipment_id = Column(String, nullable=False, index=True)
    invoice_no = Column(String, nullable=False, index=True)
    port = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    # Stored as a JSON-encoded string so we don't need a separate items
    # table for this MVP scope; kept as Text at the DB layer.
    items = Column(Text, nullable=False)
    status = Column(Enum(FilingStatus), default=FilingStatus.DRAFT, nullable=False)
    submission_date = Column(DateTime(timezone=True), server_default=func.now())
