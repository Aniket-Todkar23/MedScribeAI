import React, { useState } from 'react';
import type { DoctorSignupPayload } from '../../../types/auth';

interface DoctorSignupFormProps {
  onSubmit: (payload: DoctorSignupPayload) => void;
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
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 18 }}>
    <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%', animation: 'dotPulse 1.2s ease-in-out infinite' }} />
    <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%', animation: 'dotPulse 1.2s ease-in-out infinite 0.2s' }} />
    <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%', animation: 'dotPulse 1.2s ease-in-out infinite 0.4s' }} />
  </span>
);

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '8px 0 0 0',
};
const fieldGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' };

export const DoctorSignupForm: React.FC<DoctorSignupFormProps> = ({
  onSubmit, onToggle, onBack, isLoading, error,
}) => {
  const [fullName, setFullName]             = useState('');
  const [email, setEmail]                   = useState('');
  const [licenseNumber, setLicenseNumber]   = useState('');
  const [phone, setPhone]                   = useState('');
  const [specialization, setSpecialization] = useState('');
  const [hospitalName, setHospitalName]     = useState('');
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
      full_name:      fullName,
      email,
      password,
      license_number: licenseNumber,
      phone:          phone          || undefined,
      specialization: specialization || undefined,
      hospital_name:  hospitalName   || undefined,
    });
  };

  const displayError = localError || error;

  return (
    <div style={{ width: '100%' }}>
      {/* Logo */}
      <div style={{ width: 38, height: 38, marginBottom: 28 }}>
        <svg viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="38" height="38" rx="10" fill="var(--color-primary)" />
          <path d="M10 19L16.5 25.5L28 12.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 27, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.6px', margin: '0 0 7px 0', lineHeight: 1.2 }}>
          Doctor Registration
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>
          Create your professional account.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
        {displayError && (
          <div className="alert alert-critical" role="alert" style={{ fontSize: 13, padding: '10px 14px' }}>
            {displayError}
          </div>
        )}

        <p style={sectionLabelStyle}>Account Details</p>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Full name <span style={{ color: 'var(--color-red)' }}>*</span></label>
          <input type="text" placeholder="Dr. Jane Doe"
            value={fullName} onChange={(e) => setFullName(e.target.value)}
            required autoComplete="name" autoFocus />
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Email address <span style={{ color: 'var(--color-red)' }}>*</span></label>
          <input type="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required autoComplete="email" />
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>License number <span style={{ color: 'var(--color-red)' }}>*</span></label>
          <input type="text" placeholder="e.g. MD-12345"
            value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
            required maxLength={50} />
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Password <span style={{ color: 'var(--color-red)' }}>*</span></label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input type={showPassword ? 'text' : 'password'}
              style={{ paddingRight: 42 }}
              placeholder="At least 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete="new-password" />
            <button type="button"
              style={{ position: 'absolute', right: 4, background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}
              onClick={() => setShowPassword((s) => !s)} tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Confirm password <span style={{ color: 'var(--color-red)' }}>*</span></label>
          <input type="password" placeholder="••••••••"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            required autoComplete="new-password" />
        </div>

        <p style={sectionLabelStyle}>Professional Info <span style={{ fontWeight: 400, color: 'var(--color-text-subtle)', textTransform: 'none', fontSize: 11 }}>(optional)</span></p>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Phone</label>
          <input type="tel" placeholder="+1 555 000 0000"
            value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Specialization</label>
          <input type="text" placeholder="e.g. Cardiology"
            value={specialization} onChange={(e) => setSpecialization(e.target.value)} maxLength={100} />
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Hospital / Clinic</label>
          <input type="text" placeholder="e.g. City General Hospital"
            value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} maxLength={200} />
        </div>

        <button type="submit" className="btn-primary btn-full btn-lg" disabled={isLoading} style={{ marginTop: 4 }}>
          {isLoading ? <LoadingDots /> : 'Create Account'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, gap: 12 }}>
        <button type="button" style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }} onClick={onBack}>
          &larr; Back
        </button>
        <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: 0 }}>
          Already have an account?{' '}
          <button type="button" style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }} onClick={onToggle}>Sign in</button>
        </p>
      </div>
    </div>
  );
};
