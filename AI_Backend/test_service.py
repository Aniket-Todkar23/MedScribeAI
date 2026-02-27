"""
AI Core Service — Test Script
===============================
Tests all endpoints against a running AI_Backend instance.
Run the service first:  uvicorn main:app --reload --port 8000

Usage:  python test_service.py
"""

import asyncio
import json
import sys
import time
from pathlib import Path

import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"
TIMEOUT = 60.0
MODAL_TIMEOUT = 600.0  # 10 min for Modal-dependent endpoints (MedGemma is slow)

# Track results
results = []


def report(name: str, passed: bool, detail: str = "", skipped: bool = False):
    status = "SKIP" if skipped else ("PASS" if passed else "FAIL")
    results.append((name, passed, detail, skipped))
    icon = "→" if skipped else ("✓" if passed else "✗")
    print(f"  [{icon}] {name}" + (f" — {detail}" if detail else ""))


def _check_503(resp, name: str) -> bool:
    """If 503, report as skipped (Modal not configured). Returns True if skipped."""
    if resp.status_code == 503:
        detail = resp.json().get("detail", "Service unavailable")
        report(name, False, detail, skipped=True)
        return True
    return False


async def run_tests():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=MODAL_TIMEOUT) as client:

        print("\n" + "=" * 60)
        print("  AI Core Service — Endpoint Tests")
        print("=" * 60)

        # ── 1. Health Check ──────────────────────────────────────────
        print("\n── Health ─────────────────────────────────────────────")
        try:
            resp = await client.get("/health")
            data = resp.json()
            report("GET /health", resp.status_code == 200, f"status={data.get('status')}")
        except httpx.ConnectError:
            print("  ✗ Cannot connect to service at", BASE_URL)
            print("    Start it with:  uvicorn main:app --reload --port 8000")
            return
        except Exception as e:
            report("GET /health", False, str(e))

        # ── 2. ICD Lookup ────────────────────────────────────────────
        print("\n── ICD Lookup ─────────────────────────────────────────")
        try:
            resp = await client.post("/icd-lookup", json={
                "query": "diabetes mellitus",
                "version": 10,
                "limit": 5,
            })
            data = resp.json()
            n_matches = len(data.get("matches", []))
            report("POST /icd-lookup (diabetes)", resp.status_code == 200, f"{n_matches} matches")
            if n_matches > 0:
                top = data["matches"][0]
                print(f"         Top match: {top.get('code')} — {top.get('title', top.get('description', ''))}")
        except Exception as e:
            report("POST /icd-lookup", False, str(e))

        try:
            resp = await client.post("/icd-lookup", json={
                "query": "hypertension",
                "version": 9,
                "limit": 3,
            })
            data = resp.json()
            n_matches = len(data.get("matches", []))
            report("POST /icd-lookup (ICD-9, hypertension)", resp.status_code == 200, f"{n_matches} matches")
        except Exception as e:
            report("POST /icd-lookup (ICD-9)", False, str(e))

        # ── 3. Extract Entities ──────────────────────────────────────
        print("\n── Entity Extraction (requires Modal MedGemma) ───────")
        sample_transcript = (
            "Doctor: Good morning. What brings you in today? "
            "Patient: I've been having severe headaches for the past two weeks, "
            "mostly on the right side. I also feel nauseous sometimes. "
            "Doctor: Any visual changes or sensitivity to light? "
            "Patient: Yes, bright lights make it worse. "
            "Doctor: I see. Any history of migraines in your family? "
            "Patient: My mother had migraines. "
            "Doctor: Let's do a neurological exam. I suspect migraines with aura. "
            "I'll prescribe sumatriptan 50mg as needed and recommend keeping a headache diary."
        )
        try:
            resp = await client.post("/extract", json={"transcript": sample_transcript})
            if _check_503(resp, "POST /extract"):
                extraction_data = None
            elif resp.status_code == 200:
                data = resp.json()
                entities = data.get("entities", {})
                n_sx = len(entities.get("symptoms", []))
                n_dx = len(entities.get("diagnoses", []))
                n_rx = len(entities.get("medications", []))
                report("POST /extract", True, f"{n_sx} symptoms, {n_dx} diagnoses, {n_rx} medications")
                # Save for downstream tests
                extraction_data = entities
            else:
                report("POST /extract", False, f"HTTP {resp.status_code}: {resp.text[:200]}")
                extraction_data = None
        except Exception as e:
            report("POST /extract", False, str(e))
            extraction_data = None

        # ── 4. Generate EMR ──────────────────────────────────────────
        print("\n── EMR Generation (requires Modal MedGemma) ──────────")
        if extraction_data:
            try:
                resp = await client.post("/generate-emr", json={"extraction": extraction_data})
                if _check_503(resp, "POST /generate-emr"):
                    emr_data = None
                elif resp.status_code == 200:
                    data = resp.json()
                    emr = data.get("emr_record", {})
                    report("POST /generate-emr", True, f"encounter_id={emr.get('encounter_id', 'N/A')}")
                    emr_data = emr
                else:
                    report("POST /generate-emr", False, f"HTTP {resp.status_code}: {resp.text[:200]}")
                    emr_data = None
            except Exception as e:
                report("POST /generate-emr", False, str(e))
                emr_data = None
        else:
            report("POST /generate-emr", False, "Skipped — no extraction data (Modal not configured)", skipped=True)
            emr_data = None

        # ── 5. Patient Summary ───────────────────────────────────────
        print("\n── Patient Summary (requires Modal MedGemma) ─────────")
        if emr_data:
            try:
                resp = await client.post("/patient-summary", json={"emr_record": emr_data})
                if _check_503(resp, "POST /patient-summary"):
                    pass
                elif resp.status_code == 200:
                    data = resp.json()
                    summary = data.get("patient_summary", "")
                    report("POST /patient-summary", True, f"{len(summary)} chars")
                    if summary:
                        print(f"         Preview: {summary[:120]}...")
                else:
                    report("POST /patient-summary", False, f"HTTP {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                report("POST /patient-summary", False, str(e))
        else:
            report("POST /patient-summary", False, "Skipped — no EMR data (Modal not configured)", skipped=True)

        # ── 6. Suggest Diagnoses ─────────────────────────────────────
        print("\n── Suggest Diagnoses (requires Modal MedGemma) ───────")
        try:
            resp = await client.post("/suggest-diagnoses", json={
                "symptoms": [
                    {"description": "severe headache"},
                    {"description": "nausea"},
                    {"description": "photophobia"},
                ],
            })
            if _check_503(resp, "POST /suggest-diagnoses"):
                pass
            elif resp.status_code == 200:
                data = resp.json()
                n_suggestions = len(data.get("suggestions", []))
                report("POST /suggest-diagnoses", True, f"{n_suggestions} suggestions")
            else:
                report("POST /suggest-diagnoses", False, f"HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            report("POST /suggest-diagnoses", False, str(e))

        # ── 7. Transcribe Audio ──────────────────────────────────────
        print("\n── Transcription (requires faster-whisper model) ─────")
        # Create a minimal WAV file (silence) for testing
        wav_header = _make_silent_wav(duration_seconds=1)
        try:
            resp = await client.post(
                "/transcribe",
                files={"file": ("test_audio.wav", wav_header, "audio/wav")},
            )
            if resp.status_code == 200:
                data = resp.json()
                report("POST /transcribe", True, f"text='{data.get('text', '')[:80]}', lang={data.get('language')}")
            else:
                report("POST /transcribe", False, f"HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            report("POST /transcribe", False, str(e))

        # ── 8. Chat ──────────────────────────────────────────────────
        print("\n── Chat (requires Modal MedGemma) ────────────────────")
        try:
            resp = await client.post("/doc/chat", json={
                "messages": [
                    {"role": "user", "content": "What are the common symptoms of Type 2 diabetes?"}
                ],
                "max_tokens": 500,
                "temperature": 0.2,
            })
            if _check_503(resp, "POST /doc/chat"):
                pass
            elif resp.status_code == 200:
                data = resp.json()
                response_text = data.get("response", data.get("content", ""))
                report("POST /doc/chat", True, f"{len(response_text)} chars")
                if response_text:
                    print(f"         Preview: {response_text[:120]}...")
            else:
                report("POST /doc/chat", False, f"HTTP {resp.status_code}: {resp.text[:200]}")
        except httpx.TimeoutException:
            report("POST /doc/chat", False, "Timed out")
        except Exception as e:
            report("POST /doc/chat", False, str(e) or repr(e))

        # ── 9. Patient Report (patient-facing, 1 Qwen + 1 MedGemma) ─
        print("\n── Patient Report (requires Modal Qwen-VL + MedGemma) ─")
        print("         (1 Qwen + 1 MedGemma call, ~1-2 min)")
        test_png = _make_test_png()
        try:
            t0 = time.time()
            resp = await client.post(
                "/doc/patient-report",
                files={"file": ("test_report.png", test_png, "image/png")},
            )
            elapsed = time.time() - t0
            if _check_503(resp, "POST /doc/patient-report"):
                pass
            elif resp.status_code == 200:
                data = resp.json()
                ps = data.get("patient_summary", {})
                doc_type = data.get("document_type", "unknown")
                has_greeting = bool(ps.get("greeting"))
                has_attention = bool(ps.get("what_needs_attention"))
                report("POST /doc/patient-report", True,
                       f"type={doc_type}, has_summary={has_greeting}, {elapsed:.1f}s")
                if ps.get("greeting"):
                    print(f"         Greeting: {ps['greeting'][:120]}...")
            else:
                report("POST /doc/patient-report", False, f"HTTP {resp.status_code}: {resp.text[:200]}")
        except httpx.TimeoutException:
            report("POST /doc/patient-report", False, "Timed out")
        except Exception as e:
            report("POST /doc/patient-report", False, str(e) or repr(e))

        # ── 10. Clinician Report (doctor-facing, 1 Qwen + 1 MedGemma) ─
        print("\n── Clinician Report (requires Modal Qwen-VL + MedGemma) ─")
        print("         (1 Qwen + 1 MedGemma call, ~1-2 min)")
        sample_history = json.dumps({
            "conditions": ["Type 2 Diabetes (diagnosed 2020)", "Hypertension"],
            "medications": ["Metformin 500mg BID", "Lisinopril 10mg daily"],
            "allergies": ["Penicillin"],
        })
        try:
            t0 = time.time()
            resp = await client.post(
                "/doc/clinician-report",
                files={"file": ("test_report.png", test_png, "image/png")},
                data={"medical_history": sample_history},
            )
            elapsed = time.time() - t0
            if _check_503(resp, "POST /doc/clinician-report"):
                pass
            elif resp.status_code == 200:
                data = resp.json()
                cs = data.get("clinician_summary", {})
                doc_type = data.get("document_type", "unknown")
                has_assessment = bool(cs.get("overall_assessment"))
                hist_included = data.get("medical_history_included", False)
                n_actions = len(cs.get("recommended_actions", []))
                report("POST /doc/clinician-report", True,
                       f"type={doc_type}, history_used={hist_included}, "
                       f"actions={n_actions}, {elapsed:.1f}s")
                if cs.get("overall_assessment"):
                    print(f"         Assessment: {cs['overall_assessment'][:120]}...")
            else:
                report("POST /doc/clinician-report", False, f"HTTP {resp.status_code}: {resp.text[:200]}")
        except httpx.TimeoutException:
            report("POST /doc/clinician-report", False, "Timed out")
        except Exception as e:
            report("POST /doc/clinician-report", False, str(e) or repr(e))

        # ── 11. Document Analysis (slowest — 3 Modal calls) ─────────
        print("\n── Document Analysis (requires Modal Qwen-VL + MedGemma) ─")
        print("         (This takes 3-5 min: QwenVL + 2x MedGemma calls)")
        # Reuse test_png from above (or create if not yet made)
        try:
            resp = await client.post(
                "/doc/analyze-document",
                files={"file": ("test_doc.png", test_png, "image/png")},
            )
            if _check_503(resp, "POST /doc/analyze-document"):
                pass
            elif resp.status_code == 200:
                data = resp.json()
                stages = data.get("stages_completed", [])
                t_ms = data.get("processing_time_ms", 0)
                report("POST /doc/analyze-document", True, f"stages={stages}, {t_ms/1000:.1f}s")
            else:
                report("POST /doc/analyze-document", False, f"HTTP {resp.status_code}: {resp.text[:200]}")
        except httpx.TimeoutException:
            report("POST /doc/analyze-document", False, "Timed out (Modal too slow or container crashed)")
        except Exception as e:
            report("POST /doc/analyze-document", False, str(e) or repr(e))

    # ── Summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    passed = sum(1 for _, p, _, s in results if p and not s)
    skipped = sum(1 for _, _, _, s in results if s)
    failed = sum(1 for _, p, _, s in results if not p and not s)
    total = len(results)
    print(f"  Results: {passed} passed, {skipped} skipped (no Modal), {failed} failed  ({total} total)")

    if skipped > 0:
        print(f"\n  Skipped tests (set Modal URLs in .env to enable):")
        for name, p, detail, s in results:
            if s:
                print(f"    → {name}")

    if failed > 0:
        print(f"\n  Failed tests:")
        for name, p, detail, s in results:
            if not p and not s:
                print(f"    ✗ {name}: {detail}")

    print("=" * 60 + "\n")
    return failed == 0


def _make_silent_wav(duration_seconds: float = 1.0, sample_rate: int = 16000) -> bytes:
    """Generate a minimal silent WAV file."""
    import struct
    num_samples = int(sample_rate * duration_seconds)
    data_size = num_samples * 2  # 16-bit mono
    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF',
        36 + data_size,
        b'WAVE',
        b'fmt ',
        16,         # chunk size
        1,          # PCM
        1,          # mono
        sample_rate,
        sample_rate * 2,
        2,          # block align
        16,         # bits per sample
        b'data',
        data_size,
    )
    return header + b'\x00' * data_size


def _make_test_png() -> bytes:
    """Generate a minimal 1x1 white PNG."""
    import struct
    import zlib

    def _chunk(chunk_type: bytes, data: bytes) -> bytes:
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack('>I', len(data)) + c + crc

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    raw_data = b'\x00\xff\xff\xff'  # filter byte + RGB white
    idat = zlib.compress(raw_data)

    return signature + _chunk(b'IHDR', ihdr) + _chunk(b'IDAT', idat) + _chunk(b'IEND', b'')


if __name__ == "__main__":
    print("\nStarting AI Core Service tests...")
    print("Make sure the service is running: uvicorn main:app --reload --port 8000\n")
    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)
