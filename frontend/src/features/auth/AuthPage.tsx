import React, { useState, useCallback } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { LoginForm } from './components/LoginForm';
import { DoctorSignupForm } from './components/DoctorSignupForm';
import { PatientSignupForm } from './components/PatientSignupForm';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { useAuth } from '../../hooks/useAuth';
import type { GoogleProfile, DoctorSignupPayload, PatientSignupPayload } from '../../types/auth';

type Mode =
  | 'login' | 'signup-select' | 'signup-doctor' | 'signup-patient'
  | 'google-select' | 'google-doctor' | 'google-patient';

/* ── inline keyframes injected once ── */
const authStyleId = 'auth-page-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(authStyleId)) {
  const style = document.createElement('style');
  style.id = authStyleId;
  style.textContent = `
    @keyframes authFormEnter{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes authFormExit{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-20px)}}
    @keyframes authTaglineEnter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes dotPulse{0%,80%,100%{transform:scale(.75);opacity:.45}40%{transform:scale(1);opacity:1}}
  `;
  document.head.appendChild(style);
}

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [isExiting, setIsExiting] = useState(false);
  const isMounted = useRef(true);
  const { login, signupDoctor, signupPatient, googleAuth, googleCompleteDoctor, googleCompletePatient, isLoading, error, clearError } = useAuth();

  /* ── Google pending state ── */
  const [googlePendingToken, setGooglePendingToken] = useState<string | null>(null);
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const switchMode = useCallback((next: Mode) => {
    clearError();
    setMode(next);
  }, [clearError]);

  const handleToggleLogin = useCallback(() => {
    setGooglePendingToken(null);
    setGoogleProfile(null);
    switchMode(mode === 'login' ? 'signup-select' : 'login');
  }, [mode, switchMode]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login({ email, password });
    },
    [login],
  );

  /* ── Google OAuth credential handler ── */
  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      const result = await googleAuth(credential);
      if (!result) return;           // error already set in context
      if (result.token && result.user) return; // auto-logged in — App.tsx will redirect
      // New user → needs profile completion
      if (result.needs_profile && result.google_profile && result.pending_token) {
        setGooglePendingToken(result.pending_token);
        setGoogleProfile(result.google_profile);
        switchMode('google-select');
      }
    },
    [googleAuth, switchMode],
  );

  /* ── Google profile completion handlers ── */
  const handleGoogleDoctorSubmit = useCallback(
    async (payload: DoctorSignupPayload) => {
      if (!googlePendingToken) return;
      await googleCompleteDoctor({
        pending_token:  googlePendingToken,
        full_name:      payload.full_name,
        license_number: payload.license_number,
        phone:          payload.phone,
        specialization: payload.specialization,
        hospital_name:  payload.hospital_name,
      });
    },
    [googlePendingToken, googleCompleteDoctor],
  );

  const handleGooglePatientSubmit = useCallback(
    async (payload: PatientSignupPayload) => {
      if (!googlePendingToken) return;
      await googleCompletePatient({
        pending_token:     googlePendingToken,
        full_name:         payload.full_name,
        phone:             payload.phone,
        date_of_birth:     payload.date_of_birth,
        gender:            payload.gender,
        blood_group:       payload.blood_group,
      });
    },
    [googlePendingToken, googleCompletePatient],
  );

  const tagline = (() => {
    switch (mode) {
      case 'login':
        return { title: 'Good to see you again', text: 'Your health journey continues here.' };
      case 'signup-select':
        return { title: 'Join us today', text: 'Choose your role to get started.' };
      case 'signup-doctor':
      case 'google-doctor':
        return { title: 'For healthcare providers', text: 'Manage patients and appointments in one place.' };
      case 'signup-patient':
      case 'google-patient':
        return { title: 'Start your journey', text: 'Join thousands managing their health smarter.' };
      case 'google-select':
        return { title: 'Almost there!', text: 'Choose your role to complete setup.' };
    }
  })();

  const formAnimation = 'authFormEnter 0.42s cubic-bezier(0.25,0.46,0.45,0.94) both';


  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #eef2ff 0%, #f8fafc 45%, #fdf4ff 100%)', padding: 24 }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: 960, minHeight: 580, background: '#fff', borderRadius: 24, boxShadow: '0 0 0 1px rgba(99,102,241,0.06), 0 24px 64px rgba(99,102,241,0.09), 0 8px 24px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

        {/* ─── Left: Form Panel ─────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '52px 56px', position: 'relative', overflow: 'hidden' }}>
          <div key={mode} style={{ width: '100%', animation: formAnimation }}>
            {mode === 'login' && (
              <LoginForm
                onSubmit={handleLogin}
                onToggle={handleToggleLogin}
                onGoogleCredential={handleGoogleCredential}
                isLoading={isLoading}
                error={error}
              />
            )}

            {mode === 'signup-select' && (
              <div style={{ width: '100%' }}>
                <div style={{ width: 38, height: 38, marginBottom: 28 }}>
                  <svg viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="38" height="38" rx="10" fill="var(--color-primary)" />
                    <path d="M10 19L16.5 25.5L28 12.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ marginBottom: 28 }}>
                  <h1 style={{ fontSize: 27, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.6px', margin: '0 0 7px 0', lineHeight: 1.2 }}>
                    Create an account
                  </h1>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>I am a…</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '8px 0 24px' }}>
                  <button
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 20px', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 14, cursor: 'pointer', color: 'var(--color-text-secondary)', transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s, background 0.2s' }}
                    onClick={() => switchMode('signup-doctor')}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(31,159,163,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M19 14.5l-2.47-2.47" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3m-3-3h6" />
                    </svg>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Doctor</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Healthcare provider</span>
                  </button>

                  <button
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 20px', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 14, cursor: 'pointer', color: 'var(--color-text-secondary)', transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s, background 0.2s' }}
                    onClick={() => switchMode('signup-patient')}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(31,159,163,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                    </svg>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Patient</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Personal health portal</span>
                  </button>
                </div>

                <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 22 }}>
                  Already have an account?{' '}
                  <button type="button" style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }} onClick={handleToggleLogin}>
                    Sign in
                  </button>
                </p>

                {/* ── Divider + Google Sign-Up ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>or</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                </div>
                <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" disabled={isLoading} />
              </div>
            )}

            {/* ── Google role selection (new Google users) ── */}
            {mode === 'google-select' && (
              <div style={{ width: '100%' }}>
                <div style={{ width: 38, height: 38, marginBottom: 28 }}>
                  <svg viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="38" height="38" rx="10" fill="var(--color-primary)" />
                    <path d="M10 19L16.5 25.5L28 12.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <h1 style={{ fontSize: 27, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.6px', margin: '0 0 7px 0', lineHeight: 1.2 }}>
                    Complete your profile
                  </h1>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>
                    Choose your role to finish setting up your account.
                  </p>
                </div>

                {/* Google email badge */}
                {googleProfile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '8px 12px', background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                    <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{googleProfile.email}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '8px 0 24px' }}>
                  <button
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 20px', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 14, cursor: 'pointer', color: 'var(--color-text-secondary)', transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s, background 0.2s' }}
                    onClick={() => switchMode('google-doctor')}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(31,159,163,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M19 14.5l-2.47-2.47" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3m-3-3h6" />
                    </svg>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Doctor</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Healthcare provider</span>
                  </button>
                  <button
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 20px', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 14, cursor: 'pointer', color: 'var(--color-text-secondary)', transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s, background 0.2s' }}
                    onClick={() => switchMode('google-patient')}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(31,159,163,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                    </svg>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Patient</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Personal health portal</span>
                  </button>
                </div>

                <button type="button" style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }} onClick={handleToggleLogin}>
                  &larr; Back to Sign in
                </button>
              </div>
            )}

            {mode === 'signup-doctor' && (
              <DoctorSignupForm
                onSubmit={(p) => signupDoctor(p)}
                onToggle={handleToggleLogin}
                onBack={() => switchMode('signup-select')}
                isLoading={isLoading}
                error={error}
              />
            )}

            {mode === 'signup-patient' && (
              <PatientSignupForm
                onSubmit={(p) => signupPatient(p)}
                onToggle={handleToggleLogin}
                onBack={() => switchMode('signup-select')}
                isLoading={isLoading}
                error={error}
              />
            )}

            {/* ── Google profile-completion forms ── */}
            {mode === 'google-doctor' && googleProfile && (
              <DoctorSignupForm
                onSubmit={handleGoogleDoctorSubmit}
                onToggle={handleToggleLogin}
                onBack={() => switchMode('google-select')}
                isLoading={isLoading}
                error={error}
                googleProfile={{ name: googleProfile.name, email: googleProfile.email }}
              />
            )}

            {mode === 'google-patient' && googleProfile && (
              <PatientSignupForm
                onSubmit={handleGooglePatientSubmit}
                onToggle={handleToggleLogin}
                onBack={() => switchMode('google-select')}
                isLoading={isLoading}
                error={error}
                googleProfile={{ name: googleProfile.name, email: googleProfile.email }}
              />
            )}
          </div>
        </div>

        {/* ─── Right: Lottie Panel ──────────────────────── */}
        <div style={{
          flex: 1,
          background: '#1e1b4b',
          backgroundImage: 'radial-gradient(ellipse at 65% 30%, rgba(99,102,241,0.32) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(139,92,246,0.22) 0%, transparent 50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '52px 40px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '100%', position: 'relative', zIndex: 1 }}>
            <div style={{ width: '100%', maxWidth: 280, aspectRatio: '1/1', filter: 'drop-shadow(0 12px 36px rgba(99,102,241,0.35))' }}>
              <DotLottieReact
                src="https://lottie.host/5a06233e-21c6-45dc-ac6f-0b6f59b143a2/wzFpW8re8y.lottie"
                loop
                autoplay
              />
            </div>

            <div key={`tagline-${mode}`} style={{ textAlign: 'center', animation: 'authTaglineEnter 0.5s cubic-bezier(0.25,0.46,0.45,0.94) both 0.08s' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px 0', letterSpacing: '-0.3px', lineHeight: 1.35 }}>{tagline.title}</h2>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.48)', margin: 0, lineHeight: 1.65 }}>{tagline.text}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
