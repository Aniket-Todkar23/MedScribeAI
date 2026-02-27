# Smart EMR — frontend

A modern, high-performance React frontend for the Smart EMR system, built with Vite, TypeScript, Tailwind CSS v4, and Framer Motion.

## Features

- **Professional UI/UX:** Deep Teal medical theme, glassmorphism elements, and smooth `framer-motion` page transitions.
- **Patient Portal:** Vitals dashboard, document upload center (drag-and-drop), and an interactive floating LangGraph AI Assistant.
- **Clinician Portal:** Agenda view, AI-summarized patient history viewer, and a real-time WebRTC Meeting Room interface.
- **AI Clinician Sidebar:** During video calls, the doctor has a sidebar to prompt MedGemma/Ollama for differential diagnoses based on real-time transcriptions.

## Tech Stack

- **Framework:** Vite + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (native CSS configuration) + `clsx` / `tailwind-merge`
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **State Management:** Zustand (Auth/User)
- **Routing:** React Router v7
- **Markdown:** React Markdown for AI responses

## Setup

```bash
cd frontend
npm install
```

## Running the Development Server

```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

## Notes on Integration

- The API client is configured in `src/lib/api.ts` to point to the backend at `http://localhost:3001`.
- The WebRTC LiveKit connections and AI responses are currently mocked but configured to integrate seamlessly with the `.post('/api/v1/agent/...')` endpoints once the backend servers are running.
