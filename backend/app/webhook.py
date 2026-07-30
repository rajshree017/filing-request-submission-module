"""
Simulated EDI/webhook trigger.

Real customs filings get pushed onward to an EDI (Electronic Data
Interchange) system once submitted. We don't have a live EDI endpoint
for this MVP, so this module simulates that call: it logs a payload
that mirrors what a real webhook POST would send, and returns a fake
acknowledgement ID. Swapping in a real HTTP call later is a one-line
change (see the commented-out `requests.post` below).
"""

import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("edi_webhook")
logging.basicConfig(level=logging.INFO)


def trigger_edi_submission(filing_id: str, invoice_no: str) -> dict:
    """Simulate notifying an external EDI system that a filing was submitted."""

    payload = {
        "event": "filing.submitted",
        "filing_id": filing_id,
        "invoice_no": invoice_no,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # In production this would be a real outbound call, e.g.:
    # response = requests.post(EDI_WEBHOOK_URL, json=payload, timeout=5)
    # response.raise_for_status()
    # return response.json()

    logger.info("Simulated EDI webhook fired: %s", payload)

    return {
        "acknowledged": True,
        "edi_reference": f"EDI-{uuid.uuid4().hex[:10].upper()}",
        "payload_sent": payload,
    }
