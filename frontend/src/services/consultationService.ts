import axios from 'axios';

<<<<<<< Updated upstream
const API_BASE =
  (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

=======
const API_BASE = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3000/api';

const api = axios.create({ baseURL: API_BASE });

// Attach JWT
>>>>>>> Stashed changes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

<<<<<<< Updated upstream
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
=======
/* ──────────── Types ──────────── */

export interface BatchTurn {
  speaker: string;
  text: string;
  start_time: number | null;
  end_time: number | null;
}

export interface AudioBatchResponse {
  success: boolean;
  batch_index: number;
  batch_turns: BatchTurn[];
  batch_text: string;
  batch_end_time: number;
  raw_transcript_fragment: string;
  total_transcript_length: number;
}

export interface ConsultationEntities {
  vitals?: Record<string, any>[];
  symptoms?: Record<string, any>[];
  diagnoses?: Record<string, any>[];
  medications?: Record<string, any>[];
  allergies?: Record<string, any>[];
  [key: string]: any;
}

export interface DoctorSummary {
  chief_complaint?: string;
  history_of_present_illness?: string;
  review_of_systems?: string;
  physical_examination?: string;
  assessment?: string;
  plan?: string[];
  diagnoses?: { condition: string; icd_code?: string; severity?: string }[];
  medications_prescribed?: { name: string; dosage: string; frequency: string; duration: string }[];
  lab_orders?: string[];
  follow_up?: string;
  [key: string]: any;
}

export interface PatientSummary {
  greeting?: string;
  visit_summary?: string;
  what_we_found?: string;
  your_diagnosis?: string;
  medications?: { name: string; why: string; how_to_take: string; warning?: string }[];
  things_to_do?: string[];
  diet_recommendations?: { eat_more: string[]; eat_less: string[] };
  lifestyle_changes?: string[];
  warning_signs?: string[];
  recovery_timeline?: string;
  next_appointment?: string;
  encouraging_note?: string;
  [key: string]: any;
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  hpi?: string;
  ros?: string;
}

export interface IcdCode {
  code: string;
  description: string;
}

export interface FinaliseResponse {
  success: boolean;
  consultation_id: string;
  emr_id: string;
  entities: ConsultationEntities;
  doctor_summary: DoctorSummary;
  patient_summary: PatientSummary;
  soap_note: SoapNote;
  icd_codes: IcdCode[];
  pdf_available: boolean;
  email_sent: boolean;
}

export interface ConsultationDetail {
  consultation_id: string;
  doctor_id: string;
  patient_id: string;
  status: string;
  transcription: string;
  soap_note: SoapNote | null;
  icd_codes: IcdCode[] | null;
  patient_summary: PatientSummary | string | null;
  consultation_date: string;
  patient_name: string;
  patient_email: string;
  doctor_name: string;
  specialization: string;
}

export interface ConsultationListItem {
  consultation_id: string;
  status: string;
  consultation_date: string;
  created_at: string;
  patient_name: string;
  doctor_name: string;
  specialization: string;
}

/* ──────────── API Calls ──────────── */

/**
 * Create a new consultation
 */
export async function createConsultation(
  doctorId: string,
  patientId: string,
  appointmentId?: string,
): Promise<{ success: boolean; consultation_id: string }> {
  const { data } = await api.post('/consultations', {
    doctor_id: doctorId,
    patient_id: patientId,
    appointment_id: appointmentId,
  });
  return data;
}

/**
 * Send an audio batch for transcription
 */
export async function sendAudioBatch(
  consultationId: string,
  audioBlob: Blob,
  batchIndex: number,
  previousEndTime: number,
): Promise<AudioBatchResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, `batch_${batchIndex}.webm`);
  formData.append('batch_index', String(batchIndex));
  formData.append('previous_end_time', String(previousEndTime));

  const { data } = await api.post(
    `/consultations/${consultationId}/audio-batch`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 },
  );
  return data;
}

/**
 * Finalise consultation — trigger entity extraction, summaries, PDFs, email
 */
export async function finaliseConsultation(
  consultationId: string,
): Promise<FinaliseResponse> {
  const { data } = await api.post(
    `/consultations/${consultationId}/finalise`,
    {},
    { timeout: 300000 }, // 5 min — MedGemma can be slow
  );
  return data;
}

/**
 * Get full consultation detail
 */
export async function getConsultation(
  consultationId: string,
): Promise<{ success: boolean; consultation: ConsultationDetail; emr_record: any }> {
  const { data } = await api.get(`/consultations/${consultationId}`);
  return data;
}

/**
 * List consultations filtered by patient_id and/or doctor_id
 */
export async function listConsultations(
  filters: { patient_id?: string; doctor_id?: string } = {},
): Promise<{ success: boolean; consultations: ConsultationListItem[] }> {
  const params = new URLSearchParams();
  if (filters.patient_id) params.set('patient_id', filters.patient_id);
  if (filters.doctor_id) params.set('doctor_id', filters.doctor_id);
  const { data } = await api.get(`/consultations?${params.toString()}`);
  return data;
}

/**
 * Download doctor PDF
 */
export function getDoctorPdfUrl(consultationId: string): string {
  return `${API_BASE}/consultations/${consultationId}/pdf/doctor`;
}
>>>>>>> Stashed changes
