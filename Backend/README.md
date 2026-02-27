# Smart EMR — Server Backend

Primary FastAPI backend for the Smart EMR system. Handles authentication, database CRUD, HIPAA compliance, FHIR R4 export, LiveKit room management, and LangGraph AI agents.

## Tech Stack

- **Framework**: FastAPI 0.115 / Python 3.11
- **Database**: PostgreSQL 16 (async via SQLAlchemy 2.0 + asyncpg)
- **Migrations**: Alembic
- **Auth**: JWT (HS256) + bcrypt password hashing
- **AI Agents**: LangGraph 0.2.60 + LangChain 0.3.14
- **LLMs**: Gemini 2.0 Flash (primary) → Ollama Qwen2.5:7b (fallback) → keyword matching
- **Video**: LiveKit API for WebRTC room management
- **HTTP Client**: httpx (AI backend proxy + Ollama integration)

## Setup

### Local Development

```bash
cd Backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Configure `.env`:
```env
DATABASE_URL=postgresql+asyncpg://smartemr:smartemr_dev_2026@localhost:5433/smartemr
JWT_SECRET=dev-secret-key-change-in-production-2026
GEMINI_API_KEY=<your-key>
AI_BACKEND_URL=http://localhost:8000/api/v1
LIVEKIT_URL=http://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

Run:
```bash
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

### Docker (Recommended)

```bash
cd ..  # project root
docker compose up --build -d server
```

The Docker Compose overrides localhost URLs with service names automatically.

## API Endpoints (58 routes)

### Auth (`/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/signup/doctor` | Register doctor account |
| POST | `/signup/patient` | Register patient account |
| POST | `/login` | Authenticate → JWT token |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Get current user profile |

### Patients (`/patients`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Get own profile |
| PUT | `/me` | Update own profile |
| POST | `/me/onboarding` | Submit medical history onboarding |
| GET | `/me/onboarding` | Get own onboarding data |
| GET | `/{patient_id}` | Get patient by ID (doctor only) |
| GET | `/{patient_id}/onboarding` | Get patient onboarding (doctor only) |

### Doctors (`/doctors`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all doctors (public) |
| GET | `/me` | Get own profile |
| PUT | `/me` | Update own profile |
| GET | `/{doctor_id}` | Get doctor by ID |

### Appointments (`/appointments`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Book appointment (patient) |
| GET | `/` | List appointments |
| GET | `/upcoming` | Upcoming appointments |
| GET | `/{id}` | Get appointment |
| POST | `/{id}/approve` | Approve (doctor) |
| POST | `/{id}/reject` | Reject (doctor) |
| PUT | `/{id}` | Update appointment |
| DELETE | `/{id}` | Cancel appointment |

### Consultations (`/consultations`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create consultation (doctor) |
| GET | `/{id}` | Get consultation |
| PUT | `/{id}` | Update with SOAP/ICD/Rx |
| GET | `/patient/{patient_id}` | List patient consultations |
| POST | `/{id}/process-audio` | Upload audio → transcribe → extract → EMR |

### Documents (`/documents`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Upload document for AI analysis |
| GET | `/{id}` | Get document metadata |
| GET | `/patient/{patient_id}` | List patient documents |
| GET | `/{id}/patient-view` | AI-generated patient-friendly view |
| GET | `/{id}/clinician-view` | AI-generated clinician view |

### Meetings (`/meetings`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/{appointment_id}/create-room` | Create LiveKit room |
| GET | `/{appointment_id}/join-token` | Get join token |
| GET | `/{appointment_id}/status` | Room status |
| POST | `/{appointment_id}/end` | End meeting |

### AI Agents (`/agent`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/patient/chat` | Patient health assistant |
| POST | `/clinician/chat` | Clinician assistant |
| POST | `/clinician/meeting-chat` | Live meeting AI sidebar |
| GET | `/history/{session_id}` | Get chat history |
| DELETE | `/history/{session_id}` | Clear chat history |

### AI Proxy (`/ai`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | AI Core health check |
| POST | `/transcribe` | Proxy: audio transcription |
| POST | `/extract` | Proxy: entity extraction |
| POST | `/generate-emr` | Proxy: EMR generation |
| POST | `/patient-summary` | Proxy: patient summary |
| POST | `/icd-lookup` | Proxy: ICD code search |
| POST | `/suggest-diagnoses` | Proxy: differential diagnosis |
| POST | `/analyze-document` | Proxy: document analysis |
| POST | `/doc/patient-report` | Proxy: patient report |
| POST | `/doc/clinician-report` | Proxy: clinician report |
| POST | `/chat` | Proxy: AI chat completion |

### FHIR R4 (`/fhir`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/Patient/{id}` | FHIR Patient resource |
| GET | `/Encounter/{id}` | FHIR Encounter resource |
| GET | `/Condition/{id}` | FHIR Condition resources |
| GET | `/MedicationRequest/{id}` | FHIR MedicationRequest resources |

## Database (9 Tables)

| Model | Table | Fields |
|-------|-------|--------|
| `Doctor` | `doctors` | name, email, specialization, license_number, phone |
| `Patient` | `patients` | name, email, dob, gender, blood_group, phone |
| `PatientOnboarding` | `patient_onboarding` | conditions, medications, allergies, smoking, alcohol, surgeries |
| `Appointment` | `appointments` | patient_id, doctor_id, datetime, status, type, reason |
| `Consultation` | `consultations` | appointment_id, soap_notes, icd_codes, prescriptions, transcript, emr_data |
| `Document` | `documents` | patient_id, filename, type, analysis_result, status |
| `ChatHistory` | `chat_history` | user_id, session_id, role, content |
| `AuditLog` | `audit_log` | user_id, action, resource, details, ip_address |
| `NotificationLog` | `notification_log` | user_id, type, subject, status |

## LangGraph Agents

### 3-Tier LLM Fallback Chain

```
Gemini 2.0 Flash (cloud)
    │ 429 quota error? → 5-min circuit-breaker
    ▼
Ollama Qwen2.5:7b (local, via httpx)
    │ Ollama unreachable?
    ▼
Keyword-based tool dispatch (deterministic)
```

**Circuit-breaker**: On first Gemini 429 error, Gemini is disabled for 5 minutes. All subsequent requests go directly to Ollama without hitting the Gemini API, avoiding wasted quota attempts.

### Patient Agent (`patient_agent.py`)
5 tools: `get_my_health_summary`, `get_my_appointments`, `get_my_prescriptions`, `get_my_documents`, `explain_medical_term`

### Clinician Agent (`clinician_agent.py`)
4 tools: `get_patient_history`, `get_patient_overview`, `search_icd_codes`, `get_patient_documents`

### Ollama Agent (`ollama_agent.py`)
Lightweight agentic loop using raw httpx calls to Ollama's `/api/chat` API. Supports tool-calling with up to 5 rounds. Zero extra pip dependencies — uses the existing httpx package.

## Testing

```bash
# Full backend suite (69 tests)
python test_backend.py

# Agent-specific tests (8 tests)
python test_agents.py
```

Test coverage: health checks, auth, patients, doctors, appointments, consultations, documents, meetings, AI agents, AI proxy (11 endpoints), FHIR R4, access control, cleanup.

## Project Layout

```
Backend/
├── Dockerfile
├── requirements.txt
├── alembic.ini
├── alembic/              # DB migrations
├── test_backend.py       # 69-test suite
├── test_agents.py        # Agent endpoint tester
└── app/
    ├── main.py           # FastAPI app factory
    ├── config.py          # Pydantic settings
    ├── database.py        # Async SQLAlchemy engine
    ├── api/               # 10 route modules
    │   ├── auth.py, patients.py, doctors.py
    │   ├── appointments.py, consultations.py
    │   ├── documents.py, meetings.py
    │   ├── agent.py, ai_proxy.py, fhir.py
    │   └── deps.py        # Dependency injection
    ├── models/            # 9 SQLAlchemy models
    ├── schemas/           # Pydantic request/response schemas
    ├── services/          # AI service HTTP client, meeting service
    ├── agents/            # LangGraph agent system
    │   ├── patient_agent.py    # Patient health assistant
    │   ├── clinician_agent.py  # Clinical AI assistant
    │   ├── ollama_agent.py     # Local Ollama fallback
    │   ├── prompts.py          # System prompts
    │   └── tools.py            # DB-backed tool functions
    ├── compliance/        # HIPAA compliance modules
    │   ├── audit_middleware.py
    │   └── pii_masker.py
    └── utils/
```
