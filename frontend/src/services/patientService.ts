const API_BASE_URL = 'http://localhost:3000/api';

export interface Patient {
  patient_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  age?: number;
  gender: string;
  blood_group: string;
  address: string;
  emergency_contact: string;
  created_at: string;
  onboarding?: any;
}

export interface PatientProfile extends Patient {
  stats: {
    totalReports: number;
  };
}

/**
 * Search for a patient by phone number
 */
export async function searchPatientByPhone(phone: string): Promise<{ success: boolean; patient?: Patient; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/search?phone=${encodeURIComponent(phone)}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching patient:', error);
    throw error;
  }
}

/**
 * Get patient by ID
 */
export async function getPatientById(patientId: string): Promise<{ success: boolean; patient?: Patient; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting patient:', error);
    throw error;
  }
}

/**
 * Get comprehensive patient profile
 */
export async function getPatientProfile(patientId: string): Promise<{ success: boolean; profile?: PatientProfile; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/profile`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting patient profile:', error);
    throw error;
  }
}

/**
 * Store patient data in localStorage
 */
export function storePatientData(patient: Patient): void {
  localStorage.setItem('currentPatient', JSON.stringify(patient));
}

/**
 * Get patient data from localStorage
 */
export function getStoredPatientData(): Patient | null {
  const data = localStorage.getItem('currentPatient');
  return data ? JSON.parse(data) : null;
}

/**
 * Clear patient data from localStorage
 */
export function clearPatientData(): void {
  localStorage.removeItem('currentPatient');
}
