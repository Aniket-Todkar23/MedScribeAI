/* ── Smart EMR — TypeScript Types (mirrors backend Pydantic schemas) ────────── */

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: string;
  full_name: string;
  email: string;
  user_type: 'doctor' | 'patient';
  phone?: string;
  specialization?: string;
  license_number?: string;
  hospital_name?: string;
  gender?: string;
  blood_group?: string;
  avatar_url?: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface DoctorSignup {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  specialization?: string;
  license_number: string;
  hospital_name?: string;
}

export interface PatientSignup {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
}

// ── Patient ──────────────────────────────────────────────────────────────────

export interface PatientProfile {
  patient_id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  emergency_contact?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at?: string;
}

export interface PatientUpdate {
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  emergency_contact?: string;
  avatar_url?: string;
}

export interface OnboardingData {
  onboarding_id?: string;
  patient_id: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  has_diabetes: boolean;
  diabetes_type?: string;
  on_insulin: boolean;
  has_heart_disease: boolean;
  heart_conditions: string[];
  has_lung_disease: boolean;
  lung_conditions: string[];
  uses_inhaler_daily: boolean;
  no_medical_conditions: boolean;
  taking_medications: boolean;
  medications_list?: string;
  has_allergies: boolean;
  allergies_list?: string;
  smoking_status?: string;
  alcohol_use?: string;
  had_major_surgeries: boolean;
  surgeries_details?: string;
  consent_data_storage: boolean;
  consent_ai_assist: boolean;
  completed_at?: string;
}

// ── Doctor ────────────────────────────────────────────────────────────────────

export interface DoctorProfile {
  doctor_id: string;
  full_name: string;
  email: string;
  phone?: string;
  specialization?: string;
  license_number?: string;
  hospital_name?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at?: string;
}

export interface DoctorUpdate {
  full_name?: string;
  phone?: string;
  specialization?: string;
  hospital_name?: string;
  avatar_url?: string;
}

export interface DoctorListItem {
  doctor_id: string;
  full_name: string;
  specialization?: string;
  hospital_name?: string;
  avatar_url?: string;
}

// ── Appointment ──────────────────────────────────────────────────────────────

export interface AppointmentCreate {
  doctor_id: string;
  appointment_date: string;
  duration_minutes?: number;
  appointment_type?: string;
  reason?: string;
  notes?: string;
}

export interface AppointmentResponse {
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  appointment_date: string;
  duration_minutes: number;
  appointment_type: string;
  status: 'pending' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  notes?: string;
  cancelled_reason?: string;
  consultation_id?: string;
  meeting_room_id?: string;
  reminder_sent: boolean;
  created_at?: string;
  updated_at?: string;
  doctor_name?: string;
  patient_name?: string;
}

// ── Consultation ─────────────────────────────────────────────────────────────

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface PrescriptionItem {
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
  notes: string;
}

export interface ICDCodeItem {
  code: string;
  description: string;
  version: number | string;
}

export interface ConsultationCreate {
  appointment_id: string;
  patient_id: string;
}

export interface ConsultationUpdate {
  transcription?: string;
  soap_note?: SOAPNote;
  icd_codes?: ICDCodeItem[];
  prescription?: PrescriptionItem[];
  patient_summary?: string;
  emr_data?: Record<string, any>;
  extraction_data?: Record<string, any>;
  status?: string;
}

export interface ConsultationResponse {
  consultation_id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id?: string;
  transcription?: string;
  soap_note: Record<string, any>;
  icd_codes: any[];
  prescription: any[];
  patient_summary?: string;
  emr_data: Record<string, any>;
  extraction_data?: Record<string, any>;
  status: string;
  consultation_date?: string;
  created_at?: string;
  updated_at?: string;
  patient_name?: string;
}

// ── Document ─────────────────────────────────────────────────────────────────

export type AnalysisStatus = 'processing' | 'completed' | 'failed';

// AI Analysis sub-types (mirrors AI Backend Pydantic schemas)

export interface PatientSummary {
  greeting: string;
  what_was_tested: string;
  key_results: string;
  what_is_normal: string;
  what_needs_attention: string;
  next_steps: string;
  lifestyle_tips?: string;
}

export interface DocPrescriptionItem {
  drug_name: string;
  strength?: string;
  form?: string;
  quantity?: string;
  sig?: string;
  refills?: string;
  dispense_as_written?: boolean;
  prescribing_doctor?: string;
}

export interface LabTest {
  test_name: string;
  result?: string;
  unit?: string;
  reference_range?: string;
  flag: 'normal' | 'high' | 'low' | 'critical' | 'abnormal';
  notes?: string;
}

export interface LabPanel {
  panel_name: string;
  tests: LabTest[];
}

export interface DocICDCode {
  code: string;
  description: string;
  version: number;
}

export interface ClinicalInsight {
  finding: string;
  significance: string;
  urgency: 'routine' | 'urgent' | 'critical';
  related_tests: string[];
  icd_codes: DocICDCode[];
  suggested_followup?: string;
}

export interface MedicationSuggestion {
  name: string;
  indication: string;
  dose?: string;
  frequency?: string;
  route?: string;
  notes?: string;
}

export interface DocumentMetadata {
  document_type: string;
  patient_name?: string;
  patient_id?: string;
  age?: string;
  gender?: string;
  date_of_birth?: string;
  report_date?: string;
  sample_collection_date?: string;
  ordering_physician?: string;
  reporting_physician?: string;
  lab_name?: string;
  facility_name?: string;
  facility_address?: string;
  accession_number?: string;
  contact_phone?: string;
  patient_address?: string;
}

export interface ClinicianSummary {
  overall_assessment: string;
  system_findings: Record<string, string>;
  critical_values: string[];
  differential_considerations: string[];
  recommended_actions: string[];
  icd_code_summary: DocICDCode[];
  medication_recommendations: MedicationSuggestion[];
}

// Patient-facing AI report
export interface PatientReport {
  document_id?: string;
  created_at?: string;
  patient_name?: string;
  report_date?: string;
  lab_name?: string;
  document_type?: string;
  abnormal_results: LabTest[];
  total_tests_count: number;
  abnormal_count: number;
  prescriptions: DocPrescriptionItem[];
  patient_summary?: PatientSummary;
  page_count: number;
  processing_time_ms: number;
}

// Clinician-facing AI report
export interface ClinicianReport {
  document_id?: string;
  created_at?: string;
  metadata: DocumentMetadata;
  panels: LabPanel[];
  abnormal_results: LabTest[];
  prescriptions: DocPrescriptionItem[];
  clinical_insights: ClinicalInsight[];
  icd_codes: DocICDCode[];
  medication_suggestions: MedicationSuggestion[];
  clinician_summary?: ClinicianSummary;
  page_count: number;
  processing_time_ms: number;
}

// The full analysis_result stored in the document
export interface DocumentAnalysis {
  analysis_status: AnalysisStatus;
  patient_report?: PatientReport | null;
  clinician_report?: ClinicianReport | null;
  error?: string;
}

export interface DocumentResponse {
  document_id: string;
  consultation_id?: string;
  patient_id: string;
  doctor_id?: string;
  document_name: string;
  document_type?: string;
  file_size_kb?: number;
  mime_type?: string;
  notes?: string;
  analysis_result: DocumentAnalysis;
  uploaded_at?: string;
}

// ── Meeting ──────────────────────────────────────────────────────────────────

export interface MeetingJoinToken {
  token: string;
  room_name: string;
  livekit_url: string;
  identity: string;
  name: string;
  role: string;
}

export interface MeetingStatusResponse {
  room_name: string;
  is_active: boolean;
  participant_count: number;
  is_recording: boolean;
}

// ── Agent ────────────────────────────────────────────────────────────────────

export interface AgentChatRequest {
  message: string;
  session_id?: string;
}

export interface AgentChatResponse {
  response: string;
  session_id: string;
  tool_calls: Record<string, any>[];
}

// ── FHIR ─────────────────────────────────────────────────────────────────────

export interface FHIRBundle {
  resourceType: string;
  type: string;
  entry: FHIREntry[];
}

export interface FHIREntry {
  resource: Record<string, any>;
}
