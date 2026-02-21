import axios from 'axios';
import type { LoginPayload, SignupPayload, AuthResponse, DoctorSignupPayload, PatientSignupPayload } from '../types/auth';

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

  signup: (payload: SignupPayload) =>
    api.post<AuthResponse>('/auth/signup', payload).then((r) => r.data),

  signupDoctor: (payload: DoctorSignupPayload) =>
    api.post<AuthResponse>('/auth/signup/doctor', payload).then((r) => r.data),

  signupPatient: (payload: PatientSignupPayload) =>
    api.post<AuthResponse>('/auth/signup/patient', payload).then((r) => r.data),
};
