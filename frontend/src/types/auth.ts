export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface DoctorSignupPayload {
  full_name: string;
  email: string;
  password: string;
  license_number: string;
  phone?: string;
  specialization?: string;
  hospital_name?: string;
}

export interface PatientSignupPayload {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  blood_group?: string;
  address?: string;
  emergency_contact?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  user_type: 'patient' | 'doctor';
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/* ── Google OAuth ─────────────────────────── */

export interface GoogleProfile {
  name: string;
  email: string;
  google_id: string;
  picture: string;
}

export interface GoogleAuthResponse {
  /** Returned when user already exists — auto-login */
  token?: string;
  user?: AuthUser;
  /** Returned when user is new — needs profile completion */
  needs_profile?: boolean;
  google_profile?: GoogleProfile;
  pending_token?: string;
}

export interface GoogleDoctorCompletePayload {
  pending_token: string;
  full_name: string;
  license_number: string;
  phone?: string;
  specialization?: string;
  hospital_name?: string;
}

export interface GooglePatientCompletePayload {
  pending_token: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  blood_group?: string;
  address?: string;
  emergency_contact?: string;
}
