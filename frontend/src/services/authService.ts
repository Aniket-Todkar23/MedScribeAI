import axios from 'axios';
import type {
  LoginPayload, AuthResponse, DoctorSignupPayload, PatientSignupPayload,
  GoogleAuthResponse, GoogleDoctorCompletePayload, GooglePatientCompletePayload,
} from '../types/auth';

const API_BASE = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload).then((r) => r.data),

  signupDoctor: (payload: DoctorSignupPayload) =>
    api.post<AuthResponse>('/auth/signup/doctor', payload).then((r) => r.data),

  signupPatient: (payload: PatientSignupPayload) =>
    api.post<AuthResponse>('/auth/signup/patient', payload).then((r) => r.data),

  /* ── Google OAuth ─────────────────────────── */

  googleAuth: (credential: string) =>
    api.post<GoogleAuthResponse>('/auth/google', { credential }).then((r) => r.data),

  googleCompleteDoctor: (payload: GoogleDoctorCompletePayload) =>
    api.post<AuthResponse>('/auth/google/complete/doctor', payload).then((r) => r.data),

  googleCompletePatient: (payload: GooglePatientCompletePayload) =>
    api.post<AuthResponse>('/auth/google/complete/patient', payload).then((r) => r.data),

  logout: () => {
    localStorage.removeItem('auth_token');
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  },
};
