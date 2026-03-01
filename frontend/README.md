# MedScribe AI — Frontend

Modern React SPA for the MedScribe AI system. Provides separate patient and doctor portals with real-time telehealth, AI-powered diagnostics, and FHIR-compliant data export.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 + Vite 7.3 + TypeScript 5.9 |
| Styling | Tailwind CSS v4 (native CSS config) + `clsx` / `tailwind-merge` |
| Animations | Framer Motion |
| Icons | Lucide React |
| State | Zustand (auth/user) |
| Data Fetching | TanStack React Query + Axios |
| Routing | React Router v7 |
| Video | LiveKit (`@livekit/components-react` + `livekit-client`) |
| Markdown | React Markdown (AI chat responses) |

## Features

### Patient Portal
- **Dashboard**: Time-of-day greeting, vital-status indicators (BP, HR, SpO2, Temp), appointment countdown, summary stat cards, condition banner, recent visits panel
- **Document Center**: Drag-and-drop upload, AI-powered plain-English analysis viewer
- **AI Assistant**: Floating LangGraph-powered chat widget with DB-backed tools
- **Profile & Onboarding**: Medical history, allergies, medications, lifestyle
- **Analytics**: EMR PDF download, visit history stats
- **Telehealth**: LiveKit WebRTC video consultations

### Doctor Portal
- **Dashboard**: Separated pending-approval badge (amber), confirmed upcoming schedule, compact action cards, streamlined patient list
- **Consultation Editor**: Voice-first workspace with transcription, SOAP notes, ICD code entry, prescriptions, per-visit PDF report export
- **Meeting Room**: LiveKit video with AI clinician sidebar (MedGemma + Ollama)
- **Find & Book**: Doctor discovery, appointment scheduling
- **Analytics**: Practice statistics and patient outcomes

### UI/UX
- Deep Teal medical theme with glassmorphism accents
- Pill-shaped navbar with active route highlighting and user identity section (avatar + name + role)
- Smooth `framer-motion` page transitions
- Auto-logout after 15 min inactivity
- Responsive layout with mobile navigation

## Pages (11)

| Page | Path | Role | Description |
|------|------|------|-------------|
| `Home` | `/` | Public | Landing / login |
| `PatientDashboard` | `/patient` | Patient | Health snapshot with vitals & countdown |
| `DoctorDashboard` | `/doctor` | Doctor | Appointments, patients, pending approvals |
| `ConsultationEditor` | `/consultation/:id` | Doctor | Voice consultation workspace |
| `MeetingRoom` | `/meeting/:id` | Both | LiveKit WebRTC video room |
| `Meetings` | `/meetings` | Both | Meeting list / scheduling |
| `DocumentCenter` | `/documents` | Patient | Document upload & AI analysis |
| `FindDoctors` | `/find-doctors` | Patient | Doctor discovery & booking |
| `PatientProfile` | `/profile` | Patient | Profile & onboarding data |
| `DoctorAnalytics` | `/doctor/analytics` | Doctor | Practice analytics |
| `PatientAnalytics` | `/patient/analytics` | Patient | Health analytics + EMR download |

## Components (4)

| Component | Purpose |
|-----------|---------|
| `Layout` | App shell with navbar and content area |
| `Navbar` | Top navigation with active route pills, user identity (avatar, bold name, role label), mobile menu |
| `DocumentViewer` | Renders AI-extracted document analysis (findings, conditions, recommendations) |
| `PatientAgentChat` | Floating AI health assistant widget (LangGraph agent) |

## Setup

### Local Development

```bash
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

The API client (`src/lib/api.ts`) defaults to `http://localhost:3001/api/v1`. Set `VITE_API_BASE_URL` to override:

```bash
VITE_API_BASE_URL=http://your-server:3001/api/v1 npm run dev
```

### Docker

```bash
# From project root:
docker compose up --build frontend
```

The Docker build uses a multi-stage Dockerfile:
1. **Stage 1** (node:20-alpine): `npm ci` → `npm run build`
2. **Stage 2** (nginx:alpine): Serves static assets + reverse-proxies `/api/v1` to the backend

In Docker, the frontend is served at **http://localhost:5173** via nginx. API calls are transparently proxied to the `backend` container — no CORS needed.

### Build for Production

```bash
npm run build        # outputs to dist/
npm run preview      # preview the production build
```

## Project Structure

```
frontend/
├── Dockerfile              # Multi-stage: node build → nginx serve
├── nginx.conf              # SPA routing + API reverse-proxy
├── .dockerignore
├── package.json
├── vite.config.ts          # Vite + React + Tailwind v4 + path aliases
├── tsconfig.json
└── src/
    ├── App.tsx             # Router with role-based route guards
    ├── main.tsx            # React entry point
    ├── index.css           # Tailwind v4 imports + custom theme
    ├── components/
    │   ├── Layout.tsx
    │   ├── Navbar.tsx
    │   ├── DocumentViewer.tsx
    │   └── PatientAgentChat.tsx
    ├── pages/
    │   ├── Home.tsx
    │   ├── DoctorDashboard.tsx
    │   ├── PatientDashboard.tsx
    │   ├── ConsultationEditor.tsx
    │   ├── MeetingRoom.tsx
    │   ├── Meetings.tsx
    │   ├── DocumentCenter.tsx
    │   ├── FindDoctors.tsx
    │   ├── PatientProfile.tsx
    │   ├── DoctorAnalytics.tsx
    │   └── PatientAnalytics.tsx
    ├── lib/
    │   ├── api.ts          # Typed Axios client (authApi, patientApi, fhirApi, etc.)
    │   ├── types.ts        # TypeScript interfaces
    │   └── utils.ts        # cn(), formatDate(), etc.
    └── store/
        └── authStore.ts    # Zustand auth + user state + auto-logout
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:3001/api/v1` | Backend API base URL (overridden to `/api/v1` in Docker for nginx proxy) |
