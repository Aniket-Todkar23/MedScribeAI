import React, { useState } from 'react';
import type { PatientSignupPayload } from '../../../types/auth';

interface PatientSignupFormProps {
  onSubmit: (payload: PatientSignupPayload) => void;
  onToggle: () => void;
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
  <span className="auth-loading-dots">
    <span className="auth-dot" /><span className="auth-dot" /><span className="auth-dot" />
  </span>
);

export const PatientSignupForm: React.FC<PatientSignupFormProps> = ({
  onSubmit, onToggle, isLoading, error,
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
      full_name:    fullName,
      email,
      password,
      phone:        phone       || undefined,
      date_of_birth: dob        || undefined,
      gender:       (gender as 'male' | 'female' | 'other') || undefined,
      blood_group:  bloodGroup  || undefined,
    });
  };

  const displayError = localError || error;

  return (
    <div className="auth-form-inner">
      <div className="auth-logo">
        <svg viewBox="0 0 38 38" fill="none">
          <rect width="38" height="38" rx="10" fill="#1F9FA3" />
          <path d="M10 19L16.5 25.5L28 12.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="auth-form-header">
        <h1 className="auth-form-title">Create patient account</h1>
        <p className="auth-form-subtitle">Get started with your personal health portal.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {displayError && <p className="auth-error">{displayError}</p>}

        {/* Required */}
        <p className="auth-section-label">Account Details</p>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="pt-name">Full Name <span className="auth-required">*</span></label>
          <input id="pt-name" className="auth-input" type="text" placeholder="Jane Doe"
            value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
        </div>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="pt-email">Email <span className="auth-required">*</span></label>
          <input id="pt-email" className="auth-input" type="email" placeholder="jane@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="pt-password">Password <span className="auth-required">*</span></label>
          <div className="auth-input-wrapper">
            <input id="pt-password" className={`auth-input auth-input-icon`}
              type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            <button type="button" className="auth-eye-btn" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="pt-confirm">Confirm Password <span className="auth-required">*</span></label>
          <input id="pt-confirm" className="auth-input" type={showPassword ? 'text' : 'password'}
            placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            required autoComplete="new-password" />
        </div>

        {/* Optional */}
        <p className="auth-section-label">Health Info <span className="auth-optional">(optional)</span></p>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="pt-phone">Phone</label>
          <input id="pt-phone" className="auth-input" type="tel" placeholder="+1 555 000 0000"
            value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </div>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="pt-dob">Date of Birth</label>
          <input id="pt-dob" className="auth-input" type="date"
            value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="pt-gender">Gender</label>
          <select id="pt-gender" className="auth-input auth-select"
            value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">— Select —</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="auth-field-group">
          <label className="auth-label" htmlFor="pt-bg">Blood Group</label>
          <input id="pt-bg" className="auth-input" type="text" placeholder="e.g. A+"
            value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} maxLength={5} />
        </div>

        <button type="submit" className="auth-submit" disabled={isLoading}>
          {isLoading ? <LoadingDots /> : 'Create Account'}
        </button>
      </form>

      <p className="auth-toggle-text">
        Already have an account?{' '}
        <button type="button" className="auth-toggle-btn" onClick={onToggle}>Sign in</button>
      </p>
    </div>
  );
};
