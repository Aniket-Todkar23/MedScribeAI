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

export interface DoctorProfile {
  doctor_id: string;
  full_name: string;
  email: string;
  phone: string;
  specialization: string;
  license_number: string;
  hospital_name: string;
  created_at: string;
}

export interface DoctorAnalytics {
  totalPatients: number;
  todayAppointments: number;
  monthlyConsultations: number;
  conditions: {
    diabetes: { yes: number; no: number };
    heartDisease: { yes: number; no: number };
    lungDisease: { yes: number; no: number };
  };
}

export interface AuditLogEntry {
  audit_id: string;
  actor_id: string;
  actor_type: string;
  action: string;
  entity_type: string;
  entity_id: string;
  change_summary: string;
  created_at: string;
}

export interface PrescriptionPayload {
  patient_id: string;
  consultation_id?: string;
  prescription: { drug: string; dosage: string; frequency: string; duration: string; instructions?: string }[];
  diagnosis?: string;
  notes?: string;
}

/* ---------- API calls ---------- */

export const doctorService = {
  getProfile: (id: string) =>
    api.get<{ doctor: DoctorProfile }>(`/doctors/${id}/profile`)
      .then((r) => r.data.doctor),

  getAnalytics: (id: string) =>
    api.get<{ analytics: DoctorAnalytics }>(`/doctors/${id}/analytics`)
      .then((r) => r.data.analytics),

  getAuditLog: (id: string, params?: { limit?: number; offset?: number }) =>
    api.get<{ auditLog: AuditLogEntry[] }>(`/doctors/${id}/audit-log`, { params })
      .then((r) => r.data.auditLog),

  savePrescription: (data: PrescriptionPayload) =>
    api.post('/prescriptions', data)
      .then((r) => r.data),

  getCurrentUser: () =>
    api.get<{ user: DoctorProfile & { user_type: string } }>('/auth/me')
      .then((r) => r.data.user),
};
