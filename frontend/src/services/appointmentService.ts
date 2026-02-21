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

// Force re-login on 401 responses (expired / missing token)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.warn('[appointmentService] 401 — clearing auth, redirecting to login');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  },
);

/* ---------- Types ---------- */

export interface Doctor {
  doctor_id: string;
  full_name: string;
  specialization: string;
  email: string;
  phone: string;
  hospital_name?: string;
}

export interface Appointment {
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  duration_minutes: number;
  appointment_type: 'in_person' | 'telehealth' | 'follow_up' | 'emergency' | 'routine_checkup';
  status: 'pending' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason: string | null;
  notes: string | null;
  meet_link: string | null;
  google_event_id: string | null;
  consultation_id: string | null;
  cancelled_reason?: string | null;
  doctor?: Doctor;
  patient?: { patient_id: string; full_name: string; email: string; phone: string };
}

export interface CreateAppointmentPayload {
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  duration_minutes?: number;
  appointment_type?: Appointment['appointment_type'];
  reason?: string;
  notes?: string;
}

/* ---------- API calls ---------- */

export const appointmentService = {
  /* --- CRUD --- */
  create: (data: CreateAppointmentPayload) =>
    api.post<{ success: boolean; data: Appointment }>('/appointments', data)
      .then((r) => r.data.data),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Appointment }>(`/appointments/${id}`)
      .then((r) => r.data.data),

  update: (id: string, data: Partial<Appointment>) =>
    api.put<{ success: boolean; data: Appointment }>(`/appointments/${id}`, data)
      .then((r) => r.data.data),

  cancel: (id: string, reason: string) =>
    api.post<{ success: boolean; data: Appointment }>(`/appointments/${id}/cancel`, { cancelled_reason: reason })
      .then((r) => r.data.data),

  getByDoctor: (doctorId: string, params?: { status?: string; startDate?: string; endDate?: string }) =>
    api.get<{ success: boolean; data: Appointment[] }>(`/appointments/doctor/${doctorId}`, { params })
      .then((r) => r.data.data),

  getByPatient: (patientId: string, params?: { status?: string }) =>
    api.get<{ success: boolean; data: Appointment[] }>(`/appointments/patient/${patientId}`, { params })
      .then((r) => r.data.data),

  /* --- Doctor Actions --- */
  approve: (appointmentId: string) =>
    api.post<{ success: boolean; data: Appointment }>(`/appointments/${appointmentId}/approve`)
      .then((r) => r.data.data),

  reject: (appointmentId: string, reason?: string) =>
    api.post<{ success: boolean; data: Appointment }>(`/appointments/${appointmentId}/reject`, { reason })
      .then((r) => r.data.data),

  /* --- Doctors list --- */
  getAllDoctors: () =>
    api.get<{ success: boolean; data: Doctor[] }>('/appointments/doctors/all')
      .then((r) => r.data.data),

  /* --- Google OAuth --- */
  getGoogleAuthUrl: () =>
    api.get<{ success: boolean; authUrl: string }>('/appointments/google/auth-url')
      .then((r) => r.data.authUrl),

  exchangeGoogleCode: (code: string) =>
    api.post<{ success: boolean; message: string }>('/appointments/google/callback', { code })
      .then((r) => r.data),

  getGoogleTokenStatus: () =>
    api.get<{ success: boolean; connected: boolean; hasRefreshToken: boolean }>('/appointments/google/token-status')
      .then((r) => r.data),

  /* --- Recording --- */
  uploadRecording: (appointmentId: string, file: Blob, filename: string) => {
    const formData = new FormData();
    formData.append('recording', file, filename);
    return api.post<{
      success: boolean;
      data: { recordingUrl: string; blobName: string; size: number; consultationId: string };
    }>(`/appointments/${appointmentId}/recording`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }).then((r) => r.data.data);
  },

  getRecordingSasUrl: (blobName: string, expiryHours = 24) =>
    api.get<{ success: boolean; sasUrl: string }>(`/appointments/recordings/${encodeURIComponent(blobName)}/sas-url`, {
      params: { expiryHours },
    }).then((r) => r.data.sasUrl),
};
