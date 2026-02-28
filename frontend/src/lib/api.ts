/* ── Smart EMR — Typed API Client Layer ──────────────────────────────────────── */

import axios from 'axios';
import type {
  TokenResponse, LoginRequest, DoctorSignup, PatientSignup,
  PatientProfile, PatientUpdate, OnboardingData,
  DoctorProfile, DoctorUpdate, DoctorListItem,
  AppointmentCreate, AppointmentResponse, DoctorScheduleAppointment,
  ConsultationResponse, ConsultationUpdate,
  DocumentResponse, DocumentAnalysis,
  MeetingJoinToken, MeetingStatusResponse,
  AgentChatResponse,
  FHIRBundle,
} from './types';

// ── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const res = await axios.post<TokenResponse>('http://localhost:3001/api/v1/auth/refresh', { refresh_token: refresh });
          localStorage.setItem('access_token', res.data.access_token);
          localStorage.setItem('refresh_token', res.data.refresh_token);
          original.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<TokenResponse>('/auth/login', data),

  signupDoctor: (data: DoctorSignup) =>
    api.post<TokenResponse>('/auth/signup/doctor', data),

  signupPatient: (data: PatientSignup) =>
    api.post<TokenResponse>('/auth/signup/patient', data),

  me: () =>
    api.get<{ id: string; full_name: string; email: string; user_type: string }>('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken }),
};

// ── Patients ─────────────────────────────────────────────────────────────────

export const patientApi = {
  getMe: () =>
    api.get<PatientProfile>('/patients/me'),

  updateMe: (data: PatientUpdate) =>
    api.put<PatientProfile>('/patients/me', data),

  getOnboarding: () =>
    api.get<OnboardingData>('/patients/me/onboarding'),

  submitOnboarding: (data: Partial<OnboardingData>) =>
    api.post<OnboardingData>('/patients/me/onboarding', data),

  getById: (id: string) =>
    api.get<PatientProfile>(`/patients/${id}`),

  getAll: () =>
    api.get<PatientProfile[]>('/patients'),

  getOnboardingById: (id: string) =>
    api.get<OnboardingData>(`/patients/${id}/onboarding`),
};

// ── Doctors ──────────────────────────────────────────────────────────────────

export const doctorApi = {
  getAll: () =>
    api.get<DoctorListItem[]>('/doctors'),

  getMe: () =>
    api.get<DoctorProfile>('/doctors/me'),

  updateMe: (data: DoctorUpdate) =>
    api.put<DoctorProfile>('/doctors/me', data),

  getById: (id: string) =>
    api.get<DoctorProfile>(`/doctors/${id}`),
};

// ── Appointments ─────────────────────────────────────────────────────────────

export const appointmentApi = {
  create: (data: AppointmentCreate) =>
    api.post<AppointmentResponse>('/appointments', data),

  schedule: (data: DoctorScheduleAppointment) =>
    api.post<AppointmentResponse>('/appointments/schedule', data),

  getAll: () =>
    api.get<AppointmentResponse[]>('/appointments'),

  getUpcoming: () =>
    api.get<AppointmentResponse[]>('/appointments/upcoming'),

  getById: (id: string) =>
    api.get<AppointmentResponse>(`/appointments/${id}`),

  update: (id: string, data: Partial<AppointmentCreate>) =>
    api.put<AppointmentResponse>(`/appointments/${id}`, data),

  approve: (id: string) =>
    api.post<AppointmentResponse>(`/appointments/${id}/approve`),

  reject: (id: string, reason?: string) =>
    api.post<AppointmentResponse>(`/appointments/${id}/reject`, { reason }),

  cancel: (id: string) =>
    api.delete<AppointmentResponse>(`/appointments/${id}`),
};

// ── Consultations ────────────────────────────────────────────────────────────

export const consultationApi = {
  create: (appointmentId: string, patientId: string) =>
    api.post<ConsultationResponse>('/consultations', {
      appointment_id: appointmentId,
      patient_id: patientId,
    }),

  getById: (id: string) =>
    api.get<ConsultationResponse>(`/consultations/${id}`),

  update: (id: string, data: ConsultationUpdate) =>
    api.put<ConsultationResponse>(`/consultations/${id}`, data),

  getByPatient: (patientId: string) =>
    api.get<ConsultationResponse[]>(`/consultations/patient/${patientId}`),

  processAudio: (id: string, audioFile: File) => {
    const form = new FormData();
    form.append('audio', audioFile);
    return api.post<ConsultationResponse>(`/consultations/${id}/process-audio`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── Documents ────────────────────────────────────────────────────────────────

export const documentApi = {
  upload: (formData: FormData) => {
    return api.post<DocumentResponse>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30_000, // 30s — upload only, AI runs in background now
    });
  },

  getById: (id: string) =>
    api.get<DocumentResponse>(`/documents/${id}`),

  getByPatient: (patientId: string) =>
    api.get<DocumentResponse[]>(`/documents/patient/${patientId}`),

  getPatientView: (docId: string) =>
    api.get<any>(`/documents/${docId}/patient-view`),

  getClinicianView: (docId: string) =>
    api.get<any>(`/documents/${docId}/clinician-view`),

  getAnalysisStatus: (docId: string) =>
    api.get<{ document_id: string; analysis_status: string; error?: string }>(
      `/documents/${docId}/analysis-status`
    ),
};

// ── Meetings ─────────────────────────────────────────────────────────────────

export const meetingApi = {
  createRoom: (appointmentId: string) =>
    api.post<{ room_name: string; appointment_id: string }>(`/meetings/${appointmentId}/create-room`),

  joinToken: (appointmentId: string) =>
    api.get<MeetingJoinToken>(`/meetings/${appointmentId}/join-token`),

  status: (appointmentId: string) =>
    api.get<MeetingStatusResponse>(`/meetings/${appointmentId}/status`),

  end: (appointmentId: string) =>
    api.post(`/meetings/${appointmentId}/end`),

  leave: (appointmentId: string) =>
    api.post(`/meetings/${appointmentId}/leave`),
};

// ── Agent ────────────────────────────────────────────────────────────────────

export const agentApi = {
  patientChat: (message: string, sessionId?: string) =>
    api.post<AgentChatResponse>('/agent/patient/chat', { message, session_id: sessionId }),

  clinicianChat: (message: string, sessionId?: string) =>
    api.post<AgentChatResponse>('/agent/clinician/chat', { message, session_id: sessionId }),

  meetingChat: (message: string, appointmentId: string, sessionId?: string) =>
    api.post<AgentChatResponse>('/agent/clinician/meeting-chat', {
      message, appointment_id: appointmentId, session_id: sessionId,
    }),

  getHistory: (sessionId: string) =>
    api.get<{ session_id: string; messages: any[]; context: any }>(`/agent/history/${sessionId}`),

  deleteHistory: (sessionId: string) =>
    api.delete(`/agent/history/${sessionId}`),
};

// ── FHIR ─────────────────────────────────────────────────────────────────────

export const fhirApi = {
  getPatient: (id: string) =>
    api.get<FHIRBundle>(`/fhir/Patient/${id}`),

  getEncounter: (consultationId: string) =>
    api.get<FHIRBundle>(`/fhir/Encounter/${consultationId}`),

  getCondition: (consultationId: string) =>
    api.get<FHIRBundle>(`/fhir/Condition/${consultationId}`),

  getMedicationRequest: (consultationId: string) =>
    api.get<FHIRBundle>(`/fhir/MedicationRequest/${consultationId}`),

  getBundle: (consultationId: string) =>
    api.get<FHIRBundle>(`/fhir/Bundle/consultation/${consultationId}`),

  downloadBundle: (consultationId: string) =>
    api.get(`/fhir/Bundle/consultation/${consultationId}/download`, { responseType: 'blob' }),

  downloadPatientEmr: () =>
    api.get('/fhir/export/patient-emr', { responseType: 'blob' }),
};

// ── Drug Search ──────────────────────────────────────────────────────────────

export const drugApi = {
  search: (query: string, limit = 20) =>
    api.get<{ name: string; generic_name: string; category: string; common_doses: string; form: string }[]>(
      '/drugs/search', { params: { q: query, limit } }
    ),

  options: () =>
    api.get<{
      dosage_forms: string[];
      frequencies: string[];
      durations: string[];
      routes: string[];
    }>('/drugs/options'),
};

// ── AI Proxy ─────────────────────────────────────────────────────────────────

export const aiProxyApi = {
  health: () =>
    api.get('/ai/health'),

  chat: (message: string, context?: string) =>
    api.post('/ai/chat', { message, context }),

  suggestDiagnoses: (symptoms: string) =>
    api.post('/ai/suggest-diagnoses', { symptoms }),

  icdLookup: (query: string, version: number = 10, limit: number = 15) =>
    api.post('/ai/icd-lookup', { query, version, limit }),
};

export { api };
export default api;