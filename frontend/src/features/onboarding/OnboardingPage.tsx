import React, { useState } from 'react';
import styles from './onboarding.module.css';
import type { OnboardingData, OnboardingStep, ValidationErrors } from '../../types/onboarding';

const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [formData, setFormData] = useState<OnboardingData>({
    // Step 1
    fullName: '',
    dateOfBirth: '',
    gender: '',
    phoneNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',

    // Step 2
    hasDiabetes: false,
    hasHeartDisease: false,
    hasLungDisease: false,
    noMedicalConditions: false,

    // Step 3
    takingMedications: false,
    hasAllergies: false,
    smokingStatus: '',
    alcoholUse: '',
    hadMajorSurgeries: false,

    // Step 4
    consentDataStorage: false,
    consentAIAssist: false,
  });

  // Helper: update form data
  const updateField = (field: keyof OnboardingData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Calculate age from DOB
  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Validation for each step
  const validateStep = (step: OnboardingStep): boolean => {
    const newErrors: ValidationErrors = {};

    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      if (!formData.gender) newErrors.gender = 'Gender is required';
      if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
      if (!formData.emergencyContactName.trim())
        newErrors.emergencyContactName = 'Emergency contact name is required';
      if (!formData.emergencyContactPhone.trim())
        newErrors.emergencyContactPhone = 'Emergency contact phone is required';
    }

    if (step === 4) {
      if (!formData.consentDataStorage)
        newErrors.consentDataStorage = 'You must consent to data storage';
      if (!formData.consentAIAssist) newErrors.consentAIAssist = 'You must consent to AI assistance';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as OnboardingStep);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      // TODO: Send data to backend
      console.log('Submitting onboarding data:', formData);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call
      alert('Onboarding completed successfully!');
    } catch (error) {
      console.error('Submission error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = ['Basic Info', 'Medical History', 'Lifestyle', 'Consent'];
  const progressWidth = ((currentStep - 1) / 3) * 90 + '%';

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>🏥</div>
          <h1 className={styles.title}>Smart EMR Onboarding</h1>
          <p className={styles.subtitle}>Complete your medical profile to get started</p>
        </div>

        {/* Stepper + Form wrapped in centered inner container */}
        <div className={styles.contentInner}>
          {/* Stepper */}
          <div className={styles.stepper}>
            <div className={styles.stepperProgress} style={{ width: progressWidth }} />
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className={styles.stepItem}>
                <div
                  className={`${styles.stepCircle} ${
                    step === currentStep
                      ? styles.active
                      : step < currentStep
                      ? styles.completed
                      : ''
                  }`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                <span
                  className={`${styles.stepLabel} ${step === currentStep ? styles.active : ''}`}
                >
                  {stepTitles[step - 1]}
                </span>
              </div>
            ))}
          </div>

          {/* Form Steps */}
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          {/* ============================================
              STEP 1: Basic Information
              ============================================ */}
          {currentStep === 1 && (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Basic Information</h2>

              <div className={styles.fieldGroup}>
                <label className={`${styles.label} ${styles.required}`}>Full Name</label>
                <input
                  type="text"
                  className={`${styles.input} ${errors.fullName ? styles.error : ''}`}
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="John Doe"
                />
                {errors.fullName && <span className={styles.errorMsg}>{errors.fullName}</span>}
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={`${styles.label} ${styles.required}`}>Date of Birth</label>
                  <input
                    type="date"
                    className={`${styles.input} ${errors.dateOfBirth ? styles.error : ''}`}
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  />
                  {errors.dateOfBirth && (
                    <span className={styles.errorMsg}>{errors.dateOfBirth}</span>
                  )}
                  {formData.dateOfBirth && (
                    <span style={{ fontSize: '12px', color: '#7C8196', marginTop: '4px' }}>
                      Age: {calculateAge(formData.dateOfBirth)} years
                    </span>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={`${styles.label} ${styles.required}`}>Gender</label>
                  <select
                    className={`${styles.select} ${errors.gender ? styles.error : ''}`}
                    value={formData.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                  {errors.gender && <span className={styles.errorMsg}>{errors.gender}</span>}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={`${styles.label} ${styles.required}`}>Phone Number</label>
                <input
                  type="tel"
                  className={`${styles.input} ${errors.phoneNumber ? styles.error : ''}`}
                  value={formData.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
                {errors.phoneNumber && (
                  <span className={styles.errorMsg}>{errors.phoneNumber}</span>
                )}
              </div>

              <h3 className={styles.sectionTitle} style={{ marginTop: '28px' }}>
                Emergency Contact
              </h3>

              <div className={styles.fieldGroup}>
                <label className={`${styles.label} ${styles.required}`}>Contact Name</label>
                <input
                  type="text"
                  className={`${styles.input} ${
                    errors.emergencyContactName ? styles.error : ''
                  }`}
                  value={formData.emergencyContactName}
                  onChange={(e) => updateField('emergencyContactName', e.target.value)}
                  placeholder="Jane Doe"
                />
                {errors.emergencyContactName && (
                  <span className={styles.errorMsg}>{errors.emergencyContactName}</span>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label className={`${styles.label} ${styles.required}`}>Contact Phone</label>
                <input
                  type="tel"
                  className={`${styles.input} ${
                    errors.emergencyContactPhone ? styles.error : ''
                  }`}
                  value={formData.emergencyContactPhone}
                  onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
                {errors.emergencyContactPhone && (
                  <span className={styles.errorMsg}>{errors.emergencyContactPhone}</span>
                )}
              </div>
            </div>
          )}

          {/* ============================================
              STEP 2: Medical Conditions
              ============================================ */}
          {currentStep === 2 && (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>
                Have you been diagnosed with any of the following?
              </h2>

              <div className={styles.checkboxGroup}>
                {/* Diabetes */}
                <div className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    id="diabetes"
                    className={styles.checkboxInput}
                    checked={formData.hasDiabetes}
                    onChange={(e) => {
                      updateField('hasDiabetes', e.target.checked);
                      if (!e.target.checked) {
                        updateField('diabetesType', '');
                        updateField('onInsulin', false);
                      }
                    }}
                  />
                  <label htmlFor="diabetes" className={styles.checkboxLabel}>
                    Diabetes
                  </label>
                </div>

                {formData.hasDiabetes && (
                  <div className={styles.conditionalSection}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>Type</label>
                      <select
                        className={styles.select}
                        value={formData.diabetesType || ''}
                        onChange={(e) => updateField('diabetesType', e.target.value)}
                      >
                        <option value="">Select type</option>
                        <option value="type1">Type 1</option>
                        <option value="type2">Type 2</option>
                        <option value="gestational">Gestational</option>
                        <option value="not-sure">Not sure</option>
                      </select>
                    </div>

                    <div className={styles.fieldGroup}>
                      <div className={styles.checkboxOption}>
                        <input
                          type="checkbox"
                          id="insulin"
                          className={styles.checkboxInput}
                          checked={formData.onInsulin || false}
                          onChange={(e) => updateField('onInsulin', e.target.checked)}
                        />
                        <label htmlFor="insulin" className={styles.checkboxLabel}>
                          On insulin?
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Heart Disease */}
                <div className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    id="heartDisease"
                    className={styles.checkboxInput}
                    checked={formData.hasHeartDisease}
                    onChange={(e) => {
                      updateField('hasHeartDisease', e.target.checked);
                      if (!e.target.checked) {
                        updateField('heartConditions', []);
                      }
                    }}
                  />
                  <label htmlFor="heartDisease" className={styles.checkboxLabel}>
                    Heart Disease
                  </label>
                </div>

                {formData.hasHeartDisease && (
                  <div className={styles.conditionalSection}>
                    <p className={styles.conditionalTitle}>Select all that apply:</p>
                    <div className={styles.checkboxGroup}>
                      {[
                        { id: 'heart-attack', label: 'Previous heart attack' },
                        { id: 'angina', label: 'Angina' },
                        { id: 'heart-failure', label: 'Heart failure' },
                        { id: 'arrhythmia', label: 'Arrhythmia' },
                        { id: 'stent-bypass', label: 'Stent / Bypass history' },
                        { id: 'heart-not-sure', label: 'Not sure' },
                      ].map((condition) => (
                        <div key={condition.id} className={styles.checkboxOption}>
                          <input
                            type="checkbox"
                            id={condition.id}
                            className={styles.checkboxInput}
                            checked={
                              formData.heartConditions?.includes(condition.id) || false
                            }
                            onChange={(e) => {
                              const current = formData.heartConditions || [];
                              const updated = e.target.checked
                                ? [...current, condition.id]
                                : current.filter((c) => c !== condition.id);
                              updateField('heartConditions', updated);
                            }}
                          />
                          <label htmlFor={condition.id} className={styles.checkboxLabel}>
                            {condition.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Asthma / Lung Disease */}
                <div className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    id="lungDisease"
                    className={styles.checkboxInput}
                    checked={formData.hasLungDisease}
                    onChange={(e) => {
                      updateField('hasLungDisease', e.target.checked);
                      if (!e.target.checked) {
                        updateField('lungConditions', []);
                        updateField('usesInhalerDaily', false);
                      }
                    }}
                  />
                  <label htmlFor="lungDisease" className={styles.checkboxLabel}>
                    Asthma / Lung Disease
                  </label>
                </div>

                {formData.hasLungDisease && (
                  <div className={styles.conditionalSection}>
                    <p className={styles.conditionalTitle}>Select all that apply:</p>
                    <div className={styles.checkboxGroup}>
                      {[
                        { id: 'asthma', label: 'Asthma' },
                        { id: 'copd', label: 'COPD' },
                        { id: 'tuberculosis', label: 'Tuberculosis' },
                        { id: 'lung-other', label: 'Other' },
                      ].map((condition) => (
                        <div key={condition.id} className={styles.checkboxOption}>
                          <input
                            type="checkbox"
                            id={condition.id}
                            className={styles.checkboxInput}
                            checked={formData.lungConditions?.includes(condition.id) || false}
                            onChange={(e) => {
                              const current = formData.lungConditions || [];
                              const updated = e.target.checked
                                ? [...current, condition.id]
                                : current.filter((c) => c !== condition.id);
                              updateField('lungConditions', updated);
                            }}
                          />
                          <label htmlFor={condition.id} className={styles.checkboxLabel}>
                            {condition.label}
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className={styles.fieldGroup} style={{ marginTop: '12px' }}>
                      <div className={styles.checkboxOption}>
                        <input
                          type="checkbox"
                          id="inhaler"
                          className={styles.checkboxInput}
                          checked={formData.usesInhalerDaily || false}
                          onChange={(e) => updateField('usesInhalerDaily', e.target.checked)}
                        />
                        <label htmlFor="inhaler" className={styles.checkboxLabel}>
                          Use inhaler daily?
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* None */}
                <div className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    id="noConditions"
                    className={styles.checkboxInput}
                    checked={formData.noMedicalConditions}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateField('noMedicalConditions', checked);
                      if (checked) {
                        // Clear all medical conditions
                        updateField('hasDiabetes', false);
                        updateField('diabetesType', '');
                        updateField('onInsulin', false);
                        updateField('hasHeartDisease', false);
                        updateField('heartConditions', []);
                        updateField('hasLungDisease', false);
                        updateField('lungConditions', []);
                        updateField('usesInhalerDaily', false);
                      }
                    }}
                  />
                  <label htmlFor="noConditions" className={styles.checkboxLabel}>
                    None
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================
              STEP 3: Medications & Lifestyle
              ============================================ */}
          {currentStep === 3 && (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Medications & Lifestyle</h2>

              {/* Medications */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Are you taking regular medications?</label>
                <div className={styles.radioGroup}>
                  <div className={styles.radioOption}>
                    <input
                      type="radio"
                      id="meds-yes"
                      name="takingMedications"
                      className={styles.radioInput}
                      checked={formData.takingMedications === true}
                      onChange={() => updateField('takingMedications', true)}
                    />
                    <label htmlFor="meds-yes" className={styles.radioLabel}>
                      Yes
                    </label>
                  </div>
                  <div className={styles.radioOption}>
                    <input
                      type="radio"
                      id="meds-no"
                      name="takingMedications"
                      className={styles.radioInput}
                      checked={formData.takingMedications === false}
                      onChange={() => {
                        updateField('takingMedications', false);
                        updateField('medicationsList', '');
                      }}
                    />
                    <label htmlFor="meds-no" className={styles.radioLabel}>
                      No
                    </label>
                  </div>
                </div>
              </div>

              {formData.takingMedications && (
                <div className={styles.conditionalSection}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Please list your medications</label>
                    <textarea
                      className={styles.textarea}
                      value={formData.medicationsList || ''}
                      onChange={(e) => updateField('medicationsList', e.target.value)}
                      placeholder="e.g., Metformin 500mg twice daily, Lisinopril 10mg once daily"
                    />
                  </div>
                </div>
              )}

              {/* Allergies */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Do you have any allergies?</label>
                <div className={styles.radioGroup}>
                  <div className={styles.radioOption}>
                    <input
                      type="radio"
                      id="allergies-yes"
                      name="hasAllergies"
                      className={styles.radioInput}
                      checked={formData.hasAllergies === true}
                      onChange={() => updateField('hasAllergies', true)}
                    />
                    <label htmlFor="allergies-yes" className={styles.radioLabel}>
                      Yes
                    </label>
                  </div>
                  <div className={styles.radioOption}>
                    <input
                      type="radio"
                      id="allergies-no"
                      name="hasAllergies"
                      className={styles.radioInput}
                      checked={formData.hasAllergies === false}
                      onChange={() => {
                        updateField('hasAllergies', false);
                        updateField('allergiesList', '');
                      }}
                    />
                    <label htmlFor="allergies-no" className={styles.radioLabel}>
                      No
                    </label>
                  </div>
                </div>
              </div>

              {formData.hasAllergies && (
                <div className={styles.conditionalSection}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Please list your allergies</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={formData.allergiesList || ''}
                      onChange={(e) => updateField('allergiesList', e.target.value)}
                      placeholder="e.g., Penicillin, Peanuts, Latex"
                    />
                  </div>
                </div>
              )}

              {/* Smoking */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Smoking Status</label>
                <select
                  className={styles.select}
                  value={formData.smokingStatus}
                  onChange={(e) => updateField('smokingStatus', e.target.value)}
                >
                  <option value="">Select status</option>
                  <option value="never">Never</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="regularly">Regularly</option>
                </select>
              </div>

              {/* Alcohol */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Alcohol Use</label>
                <select
                  className={styles.select}
                  value={formData.alcoholUse}
                  onChange={(e) => updateField('alcoholUse', e.target.value)}
                >
                  <option value="">Select frequency</option>
                  <option value="no">No</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="regularly">Regularly</option>
                </select>
              </div>

              {/* Surgeries */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Had major surgeries in the past?</label>
                <div className={styles.radioGroup}>
                  <div className={styles.radioOption}>
                    <input
                      type="radio"
                      id="surgeries-yes"
                      name="hadMajorSurgeries"
                      className={styles.radioInput}
                      checked={formData.hadMajorSurgeries === true}
                      onChange={() => updateField('hadMajorSurgeries', true)}
                    />
                    <label htmlFor="surgeries-yes" className={styles.radioLabel}>
                      Yes
                    </label>
                  </div>
                  <div className={styles.radioOption}>
                    <input
                      type="radio"
                      id="surgeries-no"
                      name="hadMajorSurgeries"
                      className={styles.radioInput}
                      checked={formData.hadMajorSurgeries === false}
                      onChange={() => {
                        updateField('hadMajorSurgeries', false);
                        updateField('surgeriesDetails', '');
                      }}
                    />
                    <label htmlFor="surgeries-no" className={styles.radioLabel}>
                      No
                    </label>
                  </div>
                </div>
              </div>

              {formData.hadMajorSurgeries && (
                <div className={styles.conditionalSection}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Please provide details (optional)</label>
                    <textarea
                      className={styles.textarea}
                      value={formData.surgeriesDetails || ''}
                      onChange={(e) => updateField('surgeriesDetails', e.target.value)}
                      placeholder="e.g., Appendectomy 2018, Knee replacement 2020"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================
              STEP 4: Consent
              ============================================ */}
          {currentStep === 4 && (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Consent & Agreement</h2>

              <div className={styles.consentGroup}>
                <div className={styles.consentItem}>
                  <input
                    type="checkbox"
                    id="consentData"
                    className={styles.consentCheckbox}
                    checked={formData.consentDataStorage}
                    onChange={(e) => updateField('consentDataStorage', e.target.checked)}
                  />
                  <label htmlFor="consentData" className={styles.consentLabel}>
                    I consent to the secure storage and processing of my medical data in
                    accordance with HIPAA and privacy regulations.
                  </label>
                </div>
                {errors.consentDataStorage && (
                  <span className={styles.errorMsg}>{errors.consentDataStorage}</span>
                )}

                <div className={styles.consentItem}>
                  <input
                    type="checkbox"
                    id="consentAI"
                    className={styles.consentCheckbox}
                    checked={formData.consentAIAssist}
                    onChange={(e) => updateField('consentAIAssist', e.target.checked)}
                  />
                  <label htmlFor="consentAI" className={styles.consentLabel}>
                    I understand that AI may assist in medical triage and analysis, and that all
                    AI recommendations will be reviewed by qualified healthcare professionals.
                  </label>
                </div>
                {errors.consentAIAssist && (
                  <span className={styles.errorMsg}>{errors.consentAIAssist}</span>
                )}
              </div>

              <div
                style={{
                  padding: '16px',
                  background: '#E4F6F7',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#0B3C3D',
                  lineHeight: '1.6',
                }}
              >
                <strong>Note:</strong> By completing this onboarding, you're creating a Smart EMR
                account that enables AI-powered health insights, personalized care recommendations,
                and seamless coordination with your healthcare providers.
              </div>
            </div>
          )}
        </form>

        </div>

        {/* Navigation */}
        <div className={styles.navigation}>
          {currentStep > 1 && (
            <button type="button" className={styles.btnSecondary} onClick={handleBack}>
              Back
            </button>
          )}
          {currentStep < 4 ? (
            <button type="button" className={styles.btnPrimary} onClick={handleNext}>
              Next
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className={styles.loadingDots}>
                  <span className={styles.dot}></span>
                  <span className={styles.dot}></span>
                  <span className={styles.dot}></span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
