import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { CompleteProfilePayload } from '../types/auth';

/* ── inline keyframes (reuse auth animation ids) ── */
const cpStyleId = 'cp-page-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(cpStyleId)) {
  const style = document.createElement('style');
  style.id = cpStyleId;
  style.textContent = `
    @keyframes cpFadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes dotPulse{0%,80%,100%{transform:scale(.75);opacity:.45}40%{transform:scale(1);opacity:1}}
  `;
  document.head.appendChild(style);
}

const LoadingDots = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 18 }}>
    <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%', animation: 'dotPulse 1.2s ease-in-out infinite' }} />
    <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%', animation: 'dotPulse 1.2s ease-in-out infinite 0.2s' }} />
    <span style={{ width: 5, height: 5, background: '#fff', borderRadius: '50%', animation: 'dotPulse 1.2s ease-in-out infinite 0.4s' }} />
  </span>
);

type Role = 'doctor' | 'patient' | null;

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '8px 0 0 0',
};
const fieldGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' };

const CompleteProfilePage: React.FC = () => {
  const { googleProfile, completeProfile, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [role, setRole]                     = useState<Role>(null);
  const [fullName, setFullName]             = useState(googleProfile?.name ?? '');
  const [phone, setPhone]                   = useState('');
  // Doctor fields
  const [licenseNumber, setLicenseNumber]   = useState('');
  const [specialization, setSpecialization] = useState('');
  const [hospitalName, setHospitalName]     = useState('');
  // Patient fields
  const [dob, setDob]                       = useState('');
  const [gender, setGender]                 = useState('');
  const [bloodGroup, setBloodGroup]         = useState('');
  const [localError, setLocalError]         = useState('');

  const displayError = localError || error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!role) { setLocalError('Please select your role.'); return; }
    if (!fullName.trim()) { setLocalError('Full name is required.'); return; }
    if (role === 'doctor' && !licenseNumber.trim()) { setLocalError('License number is required for doctors.'); return; }

    const payload: CompleteProfilePayload = {
      user_type: role,
      full_name: fullName,
      phone: phone || undefined,
    };

    if (role === 'doctor') {
      payload.license_number = licenseNumber;
      payload.specialization = specialization || undefined;
      payload.hospital_name  = hospitalName || undefined;
    } else {
      payload.date_of_birth = dob || undefined;
      payload.gender        = (gender as 'male' | 'female' | 'other') || undefined;
      payload.blood_group   = bloodGroup || undefined;
    }

    await completeProfile(payload);
    // Navigation is handled automatically by App.tsx route guards
    // when user state is set and needsProfile becomes false
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #eef2ff 0%, #f8fafc 45%, #fdf4ff 100%)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 24, boxShadow: '0 0 0 1px rgba(99,102,241,0.06), 0 24px 64px rgba(99,102,241,0.09), 0 8px 24px rgba(0,0,0,0.04)', padding: '48px 52px', animation: 'cpFadeIn 0.42s cubic-bezier(0.25,0.46,0.45,0.94) both' }}>

        {/* ── Google profile avatar ── */}
        {googleProfile?.picture && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <img
              src={googleProfile.picture}
              alt=""
              style={{ width: 56, height: 56, borderRadius: '50%', border: '2.5px solid var(--color-primary)', objectFit: 'cover' }}
            />
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', margin: '0 0 6px', lineHeight: 1.3 }}>
            Complete your profile
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>
            Welcome, <strong>{googleProfile?.name ?? 'there'}</strong>! Tell us a bit about yourself.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
          {displayError && (
            <div className="alert alert-critical" role="alert" style={{ fontSize: 13, padding: '10px 14px' }}>
              {displayError}
            </div>
          )}

          {/* ── Role selection ── */}
          <p style={sectionLabelStyle}>I am a…</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button
              type="button"
              onClick={() => { setRole('doctor'); setLocalError(''); }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '22px 16px', background: role === 'doctor' ? 'rgba(31,159,163,0.06)' : 'var(--color-surface)',
                border: `2px solid ${role === 'doctor' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 14, cursor: 'pointer', color: 'var(--color-text-secondary)',
                transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={role === 'doctor' ? 'var(--color-primary)' : 'currentColor'} strokeWidth="1.5" width="28" height="28">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M19 14.5l-2.47-2.47" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3m-3-3h6" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: role === 'doctor' ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('patient'); setLocalError(''); }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '22px 16px', background: role === 'patient' ? 'rgba(31,159,163,0.06)' : 'var(--color-surface)',
                border: `2px solid ${role === 'patient' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 14, cursor: 'pointer', color: 'var(--color-text-secondary)',
                transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={role === 'patient' ? 'var(--color-primary)' : 'currentColor'} strokeWidth="1.5" width="28" height="28">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: role === 'patient' ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>Patient</span>
            </button>
          </div>

          {/* ── Common fields ── */}
          {role && (
            <>
              <p style={sectionLabelStyle}>Your Details</p>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Full Name <span style={{ color: 'var(--color-red)' }}>*</span></label>
                <input type="text" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={googleProfile?.email ?? ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Phone</label>
                <input type="tel" placeholder="+1 555 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </div>
            </>
          )}

          {/* ── Doctor-specific fields ── */}
          {role === 'doctor' && (
            <>
              <p style={sectionLabelStyle}>Professional Info</p>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>License Number <span style={{ color: 'var(--color-red)' }}>*</span></label>
                <input type="text" placeholder="e.g. MD-12345" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required maxLength={50} />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Specialization</label>
                <input type="text" placeholder="e.g. Cardiology" value={specialization} onChange={(e) => setSpecialization(e.target.value)} maxLength={100} />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Hospital / Clinic</label>
                <input type="text" placeholder="e.g. City General Hospital" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} maxLength={200} />
              </div>
            </>
          )}

          {/* ── Patient-specific fields ── */}
          {role === 'patient' && (
            <>
              <p style={sectionLabelStyle}>Health Info <span style={{ fontWeight: 400, color: 'var(--color-text-subtle)', textTransform: 'none', fontSize: 11 }}>(optional)</span></p>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Date of Birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Gender</label>
                <select style={{ cursor: 'pointer' }} value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Blood Group</label>
                <input type="text" placeholder="e.g. A+" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} maxLength={5} />
              </div>
            </>
          )}

          {role && (
            <button type="submit" className="btn-primary btn-full btn-lg" disabled={isLoading} style={{ marginTop: 8 }}>
              {isLoading ? <LoadingDots /> : 'Complete Registration'}
            </button>
          )}
        </form>

        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 24 }}>
          Wrong account?{' '}
          <button type="button" style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => { navigate('/'); }}>
            Go back
          </button>
        </p>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
