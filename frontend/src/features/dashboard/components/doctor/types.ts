export type DoctorTabId = 'analytics' | 'search' | 'prescription' | 'appointments' | 'records' | 'audit-logs';

export interface Medication {
  drug: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionData {
  patientName: string;
  date: string;
  diagnosis: string;
  notes: string;
  medications: Medication[];
}

export interface ChatMessage {
  role: string;
  text: string;
  time: string;
}

export interface ExamplePatient {
  patient_id: string;
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  age: number;
  gender: string;
  blood_group: string;
  address: string;
  emergency_contact: string;
  emergency_contact_name: string;
  onboarding: {
    has_diabetes: boolean;
    diabetes_type: string;
    on_insulin: boolean;
    has_heart_disease: boolean;
    heart_conditions: string[];
    has_lung_disease: boolean;
    taking_medications: boolean;
    medications_list: string;
    has_allergies: boolean;
    allergies_list: string;
    smoking_status: string;
    alcohol_use: string;
    had_major_surgeries: boolean;
    surgeries_details: string;
  };
  vitals: {
    blood_pressure: string;
    heart_rate: string;
    temperature: string;
    weight: string;
    height: string;
    bmi: number;
    oxygen_saturation: string;
    recorded_at: string;
  };
  consultations: {
    date: string;
    time: string;
    doctor_name: string;
    chief_complaint: string;
    diagnosis: string;
    icd_codes: string[];
    prescription: string[];
    notes: string;
    status: string;
  }[];
  labs: {
    test: string;
    value: string;
    range: string;
    status: string;
    date: string;
  }[];
  documents: {
    name: string;
    type: string;
    date: string;
    size: string;
  }[];
}

// Analytics Data
export const diabetesData = [
  { name: "Diabetic", value: 234, color: "#D64545" },
  { name: "Non-Diabetic", value: 1013, color: "#1F9FA3" }
];

export const heartDiseaseData = [
  { name: "Heart Disease", value: 187, color: "#F5A524" },
  { name: "Healthy", value: 1060, color: "#1F9FA3" }
];

export const asthmaData = [
  { name: "Asthmatic", value: 156, color: "#1E9DF1" },
  { name: "Non-Asthmatic", value: 1091, color: "#1F9FA3" }
];

export const ageDistributionData = [
  { name: "0-18", value: 98, color: "#4FBBC0" },
  { name: "19-35", value: 342, color: "#1F9FA3" },
  { name: "36-50", value: 487, color: "#136364" },
  { name: "51-65", value: 234, color: "#0B3C3D" },
  { name: "65+", value: 86, color: "#F5A524" }
];

export const examplePatient: ExamplePatient = {
  patient_id: '550e8400-e29b-41d4-a716-446655440000',
  full_name: 'John Michael Doe',
  phone: '+1234567890',
  email: 'john.doe@email.com',
  date_of_birth: '1975-06-15',
  age: 49,
  gender: 'Male',
  blood_group: 'O+',
  address: '123 Medical Plaza, Suite 456, Healthcare City, HC 12345',
  emergency_contact: '+1234567899',
  emergency_contact_name: 'Jane Doe (Spouse)',
  
  onboarding: {
    has_diabetes: true,
    diabetes_type: 'Type 2',
    on_insulin: false,
    has_heart_disease: true,
    heart_conditions: ['Angina', 'Arrhythmia'],
    has_lung_disease: false,
    taking_medications: true,
    medications_list: 'Metformin 500mg (2x daily), Atorvastatin 20mg (once daily), Aspirin 81mg (once daily)',
    has_allergies: true,
    allergies_list: 'Penicillin (causes rash), Pollen',
    smoking_status: 'Never',
    alcohol_use: 'Occasionally',
    had_major_surgeries: true,
    surgeries_details: 'Appendectomy (2005), Knee arthroscopy (2018)',
  },

  vitals: {
    blood_pressure: '138/88 mmHg',
    heart_rate: '82 bpm',
    temperature: '98.4°F',
    weight: '185 lbs',
    height: '5\'10"',
    bmi: 26.5,
    oxygen_saturation: '97%',
    recorded_at: 'Feb 21, 2026 10:30 AM'
  },

  consultations: [
    {
      date: 'Feb 15, 2026',
      time: '2:30 PM',
      doctor_name: 'Dr. Sarah Johnson',
      chief_complaint: 'Chest pain and shortness of breath',
      diagnosis: 'Angina pectoris, Type 2 Diabetes follow-up',
      icd_codes: ['I20.9 - Angina pectoris', 'E11.9 - Type 2 Diabetes'],
      prescription: [
        'Nitroglycerin 0.4mg - As needed for chest pain',
        'Metformin 500mg - Twice daily with meals',
        'Atorvastatin 20mg - Once daily at bedtime'
      ],
      notes: 'Patient reports intermittent chest pain for the past 3 days, especially during physical activity. ECG shows ST-segment changes. Stress test ordered. Follow-up in 2 weeks.',
      status: 'Completed'
    },
    {
      date: 'Jan 10, 2026',
      time: '11:00 AM',
      doctor_name: 'Dr. Michael Chen',
      chief_complaint: 'Routine diabetes checkup',
      diagnosis: 'Type 2 Diabetes mellitus - well controlled',
      icd_codes: ['E11.65 - Type 2 Diabetes with hyperglycemia'],
      prescription: [
        'Metformin 500mg - Twice daily',
        'Atorvastatin 20mg - Once daily'
      ],
      notes: 'HbA1c: 6.9%, Fasting glucose: 128 mg/dL. Diabetes well-controlled. Continue current medications. Encouraged daily 30-minute walks.',
      status: 'Completed'
    },
    {
      date: 'Nov 20, 2025',
      time: '9:15 AM',
      doctor_name: 'Dr. Emily Rodriguez',
      chief_complaint: 'Knee pain post-surgery follow-up',
      diagnosis: 'Post-operative recovery, Status post arthroscopy',
      icd_codes: ['M25.561 - Pain in right knee', 'Z98.891 - History of knee surgery'],
      prescription: [
        'Ibuprofen 400mg - Three times daily with food',
        'Physical Therapy - 3x per week for 6 weeks'
      ],
      notes: 'Excellent recovery. Full range of motion restored. Pain reduced from 7/10 to 3/10. Surgical site healed well.',
      status: 'Completed'
    }
  ],

  labs: [
    { test: 'HbA1c', value: '7.2%', range: '< 5.7%', status: 'High', date: 'Feb 14, 2026' },
    { test: 'Fasting Glucose', value: '142 mg/dL', range: '70-100 mg/dL', status: 'High', date: 'Feb 14, 2026' },
    { test: 'Total Cholesterol', value: '198 mg/dL', range: '< 200 mg/dL', status: 'Normal', date: 'Feb 14, 2026' },
    { test: 'LDL Cholesterol', value: '95 mg/dL', range: '< 100 mg/dL', status: 'Normal', date: 'Feb 14, 2026' },
    { test: 'HDL Cholesterol', value: '52 mg/dL', range: '> 40 mg/dL', status: 'Normal', date: 'Feb 14, 2026' },
    { test: 'Triglycerides', value: '165 mg/dL', range: '< 150 mg/dL', status: 'High', date: 'Feb 14, 2026' }
  ],

  documents: [
    { name: 'ECG Report - Feb 2026', type: 'ECG', date: 'Feb 15, 2026', size: '245 KB' },
    { name: 'Blood Work Results', type: 'Lab Report', date: 'Feb 14, 2026', size: '128 KB' },
    { name: 'Knee X-Ray Post-Op', type: 'X-Ray', date: 'Nov 20, 2025', size: '1.2 MB' }
  ]
};
