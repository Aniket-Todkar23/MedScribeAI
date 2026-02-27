"""
HIPAA Compliance — PII Masking and De-identification
"""

import re
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# ── PII Patterns ──────────────────────────────────────────────────────────────

PII_PATTERNS = {
    "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "PHONE": re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b"),
    "EMAIL": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    "DOB": re.compile(r"\b(?:0[1-9]|1[0-2])[/-](?:0[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2}\b"),
    "MRN": re.compile(r"\bMRN[:\s#]*\d{6,12}\b", re.IGNORECASE),
    "IP_ADDRESS": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
}


def mask_pii(text: str) -> str:
    """
    Detect and mask PII in text.
    Used for logs, external API calls, and non-authorized data sharing.
    """
    if not text:
        return text

    result = text
    for pii_type, pattern in PII_PATTERNS.items():
        result = pattern.sub(f"[REDACTED_{pii_type}]", result)

    return result


def deidentify_for_llm(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    De-identify patient data before sending to external LLMs.
    Removes directly identifying information while keeping medical facts.
    """
    sensitive_keys = {
        "patient_name", "full_name", "name", "email", "phone",
        "address", "ssn", "social_security", "mrn", "patient_id",
        "date_of_birth", "dob", "emergency_contact", "emergency_contact_name",
        "emergency_contact_phone", "insurance", "policy_number",
    }

    def _clean(obj: Any) -> Any:
        if isinstance(obj, dict):
            cleaned = {}
            for key, value in obj.items():
                if key.lower() in sensitive_keys:
                    cleaned[key] = "[REDACTED]"
                elif isinstance(value, str):
                    cleaned[key] = mask_pii(value)
                elif isinstance(value, (dict, list)):
                    cleaned[key] = _clean(value)
                else:
                    cleaned[key] = value
            return cleaned
        elif isinstance(obj, list):
            return [_clean(item) for item in obj]
        elif isinstance(obj, str):
            return mask_pii(obj)
        return obj

    return _clean(data)


def deidentify_text_for_llm(text: str, patient_name: str = "", doctor_name: str = "") -> str:
    """
    De-identify free text before sending to external LLM.
    Replace names with generic labels and mask PII patterns.
    """
    result = text
    if patient_name:
        result = result.replace(patient_name, "Patient")
    if doctor_name:
        result = result.replace(doctor_name, "Doctor")
    result = mask_pii(result)
    return result
