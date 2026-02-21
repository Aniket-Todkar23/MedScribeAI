// ================================================================
// ONBOARDING TYPES — Smart EMR Multi-Step Form
// ================================================================

export interface OnboardingData {
  // Step 1: Basic Information
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | '';
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;

  // Step 2: Medical Conditions
  hasDiabetes: boolean;
  diabetesType?: 'type1' | 'type2' | 'gestational' | 'not-sure' | '';
  onInsulin?: boolean;

  hasHeartDisease: boolean;
  heartConditions?: string[];

  hasLungDisease: boolean;
  lungConditions?: string[];
  usesInhalerDaily?: boolean;

  noMedicalConditions: boolean;

  // Step 3: Medications & Lifestyle
  takingMedications: boolean;
  medicationsList?: string;
  hasAllergies: boolean;
  allergiesList?: string;
  smokingStatus: 'never' | 'occasionally' | 'regularly' | '';
  alcoholUse: 'no' | 'occasionally' | 'regularly' | '';
  hadMajorSurgeries: boolean;
  surgeriesDetails?: string;

  // Step 4: Consent
  consentDataStorage: boolean;
  consentAIAssist: boolean;
}

export interface ValidationErrors {
  [key: string]: string;
}

export type OnboardingStep = 1 | 2 | 3 | 4;
