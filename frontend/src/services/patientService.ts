import axios from 'axios';

const API_BASE =
  (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL ??
  'http://localhost:3000/api';

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

export interface Patient {
  patient_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  emergency_contact?: string;
  created_at?: string;
}

interface SearchResult {
  success: boolean;
  message?: string;
  patient?: Patient;
}

const STORAGE_KEY = 'current_patient';

/**
 * Search for a patient by phone number
 */
export async function searchPatientByPhone(phone: string): Promise<SearchResult> {
  const res = await api.get<SearchResult>('/patients/search', { params: { phone } });
  return res.data;
}

/**
 * Store selected patient data in localStorage
 */
export function storePatientData(patient: Patient): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patient));
}

/**
 * Retrieve stored patient data from localStorage
 */
export function getStoredPatientData(): Patient | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Patient;
  } catch {
    return null;
  }
}

/**
 * Clear stored patient data from localStorage
 */
export function clearPatientData(): void {
  localStorage.removeItem(STORAGE_KEY);
}