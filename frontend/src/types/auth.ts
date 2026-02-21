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
