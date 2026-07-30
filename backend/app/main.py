"""
Filing Request Submission Module — API entry point.

Endpoints:
    POST   /filings          create a new filing
    GET    /filings          list all filings
    GET    /filings/{id}     get one filing
    PUT    /filings/{id}     update a filing
    DELETE /filings/{id}     delete a filing
    POST   /filings/{id}/submit   mark submitted + fire simulated EDI webhook
"""

import json

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, SessionLocal, engine
from .webhook import trigger_edi_submission

# Creates filings.db and the filings table on first run.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Filing Request Submission Module",
    description="Customs broker filing intake API (Neximprove intern task).",
    version="1.0.0",
)

# Frontend (React dev server) needs CORS access to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _serialize(filing: models.Filing) -> dict:
    """Convert an ORM row into the shape FilingOut expects (items as list)."""
    return {
        "id": filing.id,
        "shipment_id": filing.shipment_id,
        "invoice_no": filing.invoice_no,
        "port": filing.port,
        "value": filing.value,
        "items": json.loads(filing.items),
        "status": filing.status,
        "submission_date": filing.submission_date,
    }


@app.get("/")
def root():
    return {"service": "filing-request-submission-module", "status": "ok"}


@app.post("/filings", response_model=schemas.FilingOut, status_code=201)
def create_filing(filing_in: schemas.FilingCreate, db: Session = Depends(get_db)):
    filing = models.Filing(
        shipment_id=filing_in.shipment_id,
        invoice_no=filing_in.invoice_no,
        port=filing_in.port,
        value=filing_in.value,
        items=json.dumps([item.model_dump() for item in filing_in.items]),
    )
    db.add(filing)
    db.commit()
    db.refresh(filing)
    return _serialize(filing)


@app.get("/filings", response_model=list[schemas.FilingOut])
def list_filings(db: Session = Depends(get_db)):
    filings = db.query(models.Filing).order_by(models.Filing.submission_date.desc()).all()
    return [_serialize(f) for f in filings]


@app.get("/filings/{filing_id}", response_model=schemas.FilingOut)
def get_filing(filing_id: str, db: Session = Depends(get_db)):
    filing = db.query(models.Filing).filter(models.Filing.id == filing_id).first()
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")
    return _serialize(filing)


@app.put("/filings/{filing_id}", response_model=schemas.FilingOut)
def update_filing(filing_id: str, filing_in: schemas.FilingUpdate, db: Session = Depends(get_db)):
    filing = db.query(models.Filing).filter(models.Filing.id == filing_id).first()
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")

    update_data = filing_in.model_dump(exclude_unset=True)
    if "items" in update_data and update_data["items"] is not None:
        update_data["items"] = json.dumps(update_data["items"])

    for field, value in update_data.items():
        setattr(filing, field, value)

    db.commit()
    db.refresh(filing)
    return _serialize(filing)


@app.delete("/filings/{filing_id}", status_code=204)
def delete_filing(filing_id: str, db: Session = Depends(get_db)):
    filing = db.query(models.Filing).filter(models.Filing.id == filing_id).first()
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")
    db.delete(filing)
    db.commit()
    return None


@app.post("/filings/{filing_id}/submit", response_model=dict)
def submit_filing(filing_id: str, db: Session = Depends(get_db)):
    """Bonus: mark a filing as submitted and simulate an EDI webhook trigger."""
    filing = db.query(models.Filing).filter(models.Filing.id == filing_id).first()
    if not filing:
        raise HTTPException(status_code=404, detail="Filing not found")

    filing.status = models.FilingStatus.SUBMITTED
    db.commit()
    db.refresh(filing)

    edi_result = trigger_edi_submission(filing.id, filing.invoice_no)

    return {"filing": _serialize(filing), "edi_result": edi_result}
