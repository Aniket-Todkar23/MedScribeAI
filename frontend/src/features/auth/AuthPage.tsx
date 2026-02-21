import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { LoginForm } from './components/LoginForm';
import { DoctorSignupForm } from './components/DoctorSignupForm';
import { PatientSignupForm } from './components/PatientSignupForm';
import { useAuth } from '../../hooks/useAuth';

type Mode = 'login' | 'signup-select' | 'signup-doctor' | 'signup-patient';

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
  const { login, signupDoctor, signupPatient, isLoading, error, clearError } = useAuth();

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const switchMode = useCallback((next: Mode) => {
    if (isExiting) return;
    clearError();
    setIsExiting(true);
    setTimeout(() => {
      if (!isMounted.current) return;
      setMode(next);
      setIsExiting(false);
    }, 350);
  }, [isExiting, clearError]);

  const handleToggleLogin = useCallback(() => {
    switchMode(mode === 'login' ? 'signup-select' : 'login');
  }, [mode, switchMode]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login({ email, password });
    },
    [login],
  );

  const tagline = (() => {
    switch (mode) {
      case 'login':
        return { title: 'Good to see you again', text: 'Your health journey continues here.' };
      case 'signup-select':
        return { title: 'Join us today', text: 'Choose your role to get started.' };
      case 'signup-doctor':
        return { title: 'For healthcare providers', text: 'Manage patients and appointments in one place.' };
      case 'signup-patient':
        return { title: 'Start your journey', text: 'Join thousands managing their health smarter.' };
    }
  })();

  const formAnimation = isExiting
    ? 'authFormExit 0.35s cubic-bezier(0.55,0.06,0.68,0.19) both'
    : 'authFormEnter 0.42s cubic-bezier(0.25,0.46,0.45,0.94) both';

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
