import React, { useState } from 'react';
import type { PatientSignupPayload } from '../../../types/auth';
import styles from '../auth.module.css';

interface PatientSignupFormProps {
  onSubmit: (payload: PatientSignupPayload) => void;
  onToggle: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

const EyeIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);
const LoadingDots = () => (
  <span className={styles.loadingDots}>
    <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
  </span>
);

export const PatientSignupForm: React.FC<PatientSignupFormProps> = ({
  onSubmit, onToggle, onBack, isLoading, error,
}) => {
  const [fullName, setFullName]             = useState('');
  const [email, setEmail]                   = useState('');
  const [phone, setPhone]                   = useState('');
  const [dob, setDob]                       = useState('');
  const [gender, setGender]                 = useState('');
  const [bloodGroup, setBloodGroup]         = useState('');
  const [password, setPassword]             = useState('');
  const [confirm, setConfirm]               = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [localError, setLocalError]         = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setLocalError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setLocalError("Passwords don't match."); return; }
    setLocalError('');
    onSubmit({
      full_name:     fullName,
      email,
      password,
      phone:         phone      || undefined,
      date_of_birth: dob        || undefined,
      gender:        (gender as 'male' | 'female' | 'other') || undefined,
      blood_group:   bloodGroup || undefined,
    });
  };

  const displayError = localError || error;

  return (
    <div className={styles.formInner}>
      <div className={styles.logoMark}>
        <svg viewBox="0 0 38 38" fill="none">
          <rect width="38" height="38" rx="10" fill="#6366f1" />
          <path d="M10 19L16.5 25.5L28 12.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className={styles.formHeader}>
        <h1 className={styles.formTitle}>Patient Registration</h1>
        <p className={styles.formSubtitle}>Get started with your personal health portal.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {displayError && <p className={styles.errorMsg} role="alert">{displayError}</p>}

        <p className={styles.sectionLabel}>Account Details</p>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Full Name <span className={styles.required}>*</span></label>
          <input className={styles.input} type="text" placeholder="Jane Doe"
            value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" autoFocus />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Email <span className={styles.required}>*</span></label>
          <input className={styles.input} type="email" placeholder="jane@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Password <span className={styles.required}>*</span></label>
          <div className={styles.inputWrapper}>
            <input className={`${styles.input} ${styles.inputWithIcon}`}
              type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            <button type="button" className={styles.eyeBtn}
              onClick={() => setShowPassword((v) => !v)} tabIndex={-1} aria-label="Toggle password">
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Confirm Password <span className={styles.required}>*</span></label>
          <input className={styles.input} type={showPassword ? 'text' : 'password'}
            placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            required autoComplete="new-password" />
        </div>

        <p className={styles.sectionLabel}>Health Info <span className={styles.optional}>(optional)</span></p>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Phone</label>
          <input className={styles.input} type="tel" placeholder="+1 555 000 0000"
            value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Date of Birth</label>
          <input className={styles.input} type="date"
            value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Gender</label>
          <select className={`${styles.input} ${styles.select}`}
            value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">— Select —</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Blood Group</label>
          <input className={styles.input} type="text" placeholder="e.g. A+"
            value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} maxLength={5} />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
          {isLoading ? <LoadingDots /> : 'Create Account'}
        </button>
      </form>

      <div className={styles.formFooter}>
        <button type="button" className={styles.toggleBtn} onClick={onBack}>
          &larr; Back
        </button>
        <p className={styles.toggleText}>
          Already have an account?{' '}
          <button type="button" className={styles.toggleBtn} onClick={onToggle}>Sign in</button>
        </p>
      </div>
    </div>
  );
};
