"""
API Routes — Drug Search (Prescription Autocomplete)
Provides searchable drug database for the prescription editor.
"""

import csv
import logging
import os
from typing import List

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/drugs", tags=["Drug Database"])

# ── Load drug database at module level ────────────────────────────────────────

_DRUGS: List[dict] = []


def _load_drugs():
    """Load drug database from CSV file."""
    global _DRUGS
    csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "drugs.csv")
    if not os.path.exists(csv_path):
        logger.warning(f"Drug database not found at {csv_path}")
        return
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        _DRUGS = [row for row in reader]
    logger.info(f"Loaded {len(_DRUGS)} drugs from database")


_load_drugs()

# ── Common dosage forms / frequencies for dropdowns ──────────────────────────

DOSAGE_FORMS = [
    "Tablet", "Capsule", "Liquid", "Injection", "Cream", "Ointment",
    "Drops (Eye)", "Drops (Ear)", "Inhaler", "Patch", "Suppository",
    "Powder", "Spray (Nasal)", "Solution", "Suspension", "Syrup",
    "Lozenge", "Gel", "Foam", "Film",
]

FREQUENCIES = [
    "Once daily", "Twice daily", "Three times daily", "Four times daily",
    "Every 4 hours", "Every 6 hours", "Every 8 hours", "Every 12 hours",
    "Once weekly", "Twice weekly", "Once monthly",
    "As needed (PRN)", "At bedtime", "Before meals", "After meals",
    "With meals", "In the morning", "In the evening",
]

COMMON_DURATIONS = [
    "3 days", "5 days", "7 days", "10 days", "14 days",
    "21 days", "30 days", "60 days", "90 days",
    "6 months", "1 year", "Ongoing", "As directed",
]

ROUTES = [
    "Oral", "Sublingual", "Topical", "Intravenous (IV)", "Intramuscular (IM)",
    "Subcutaneous (SC)", "Inhalation", "Rectal", "Vaginal", "Ophthalmic",
    "Otic", "Nasal", "Transdermal",
]


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/search")
async def search_drugs(
    q: str = Query(..., min_length=1, description="Search query for drug name"),
    limit: int = Query(20, ge=1, le=100),
    _current_user=Depends(get_current_user),
):
    """Search the drug database by name. Returns matching drugs for autocomplete."""
    query = q.strip().lower()
    results = []
    for drug in _DRUGS:
        name = drug.get("name", "").lower()
        if query in name:
            results.append(drug)
            if len(results) >= limit:
                break
    # Sort: exact prefix matches first
    results.sort(key=lambda d: (0 if d["name"].lower().startswith(query) else 1, d["name"]))
    return results


@router.get("/options")
async def drug_options(
    _current_user=Depends(get_current_user),
):
    """Return dropdown options for dosage forms, frequencies, durations, and routes."""
    return {
        "dosage_forms": DOSAGE_FORMS,
        "frequencies": FREQUENCIES,
        "durations": COMMON_DURATIONS,
        "routes": ROUTES,
    }
