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

export interface Consultation {
  consultation_id: string;
  doctor_id: string;
  patient_id: string;
  transcription: string | null;
  soap_note: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  icd_codes: { code: string; description: string }[];
  prescription: { drug: string; dose: string; frequency: string; duration: string }[];
  patient_summary: string | null;
  status: 'draft' | 'confirmed' | 'reviewed';
  consultation_date: string;
  doctor?: { doctor_id: string; full_name: string; specialization: string };
  patient?: { patient_id: string; full_name: string; email: string; phone: string };
}

export interface CreateConsultationPayload {
  patient_id: string;
  transcription?: string;
  soap_note?: Consultation['soap_note'];
  icd_codes?: Consultation['icd_codes'];
  prescription?: Consultation['prescription'];
  appointment_id?: string;
}

export interface UpdateConsultationPayload {
  transcription?: string;
  soap_note?: Consultation['soap_note'];
  icd_codes?: Consultation['icd_codes'];
  prescription?: Consultation['prescription'];
  patient_summary?: string;
  status?: Consultation['status'];
}

/* ---------- API calls ---------- */

export const consultationService = {
  create: (data: CreateConsultationPayload) =>
    api.post<{ consultation: Consultation }>('/consultations', data)
      .then((r) => r.data.consultation),

  getById: (id: string) =>
    api.get<{ consultation: Consultation }>(`/consultations/${id}`)
      .then((r) => r.data.consultation),

  update: (id: string, data: UpdateConsultationPayload) =>
    api.put<{ consultation: Consultation }>(`/consultations/${id}`, data)
      .then((r) => r.data.consultation),

  getByPatient: (patientId: string, limit = 20) =>
    api.get<{ consultations: Consultation[] }>(`/consultations/patient/${patientId}`, { params: { limit } })
      .then((r) => r.data.consultations),

  getByDoctor: (doctorId: string, params?: { status?: string; limit?: number }) =>
    api.get<{ consultations: Consultation[] }>(`/consultations/doctor/${doctorId}`, { params })
      .then((r) => r.data.consultations),
};
