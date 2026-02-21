import axios from 'axios';

const API_BASE =
  (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ---------- Types ---------- */

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface IcdCode {
  code: string;
  description: string;
}

export interface AIChatReply {
  role: string;
  text: string;
  time: string;
}

/* ---------- API calls ---------- */

export const aiService = {
  chat: (message: string, context?: Record<string, unknown>) =>
    api.post<{ reply: AIChatReply }>('/ai/chat', { message, context })
      .then((r) => r.data.reply),

  generateSoapNote: (transcription: string, patientContext?: Record<string, unknown>) =>
    api.post<{ soap_note: SoapNote }>('/ai/soap-note', { transcription, patient_context: patientContext })
      .then((r) => r.data.soap_note),

  generateIcdCodes: (params: { transcription?: string; diagnosis?: string }) =>
    api.post<{ icd_codes: IcdCode[] }>('/ai/icd-codes', params)
      .then((r) => r.data.icd_codes),
};
