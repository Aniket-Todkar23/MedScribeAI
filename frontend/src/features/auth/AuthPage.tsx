import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { LoginForm } from './components/LoginForm';
import { DoctorSignupForm } from './components/DoctorSignupForm';
import { PatientSignupForm } from './components/PatientSignupForm';
import { useAuth } from '../../hooks/useAuth';
import styles from './auth.module.css';

type Mode = 'login' | 'signup-select' | 'signup-doctor' | 'signup-patient';

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

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* ─── Left: Form Panel ─────────────────────────── */}
        <div className={styles.formPanel}>
          <div
            key={mode}
            className={`${styles.formContent} ${isExiting ? styles.formExit : styles.formEnter}`}
          >
            {mode === 'login' && (
              <LoginForm
                onSubmit={handleLogin}
                onToggle={handleToggleLogin}
                isLoading={isLoading}
                error={error}
              />
            )}

            {mode === 'signup-select' && (
              <div className={styles.formInner}>
                <div className={styles.logoMark}>
                  <svg viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="38" height="38" rx="10" fill="#6366f1" />
                    <path d="M10 19L16.5 25.5L28 12.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={styles.formHeader}>
                  <h1 className={styles.formTitle}>Create an account</h1>
                  <p className={styles.formSubtitle}>I am a…</p>
                </div>

                <div className={styles.roleCards}>
                  <button className={styles.roleCard} onClick={() => switchMode('signup-doctor')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M19 14.5l-2.47-2.47" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3m-3-3h6" />
                    </svg>
                    <span className={styles.roleCardTitle}>Doctor</span>
                    <span className={styles.roleCardDesc}>Healthcare provider</span>
                  </button>

                  <button className={styles.roleCard} onClick={() => switchMode('signup-patient')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                    </svg>
                    <span className={styles.roleCardTitle}>Patient</span>
                    <span className={styles.roleCardDesc}>Personal health portal</span>
                  </button>
                </div>

                <p className={styles.toggleText}>
                  Already have an account?{' '}
                  <button type="button" className={styles.toggleBtn} onClick={handleToggleLogin}>
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
        <div className={styles.lottiePanel}>
          <div className={styles.lottiePanelInner}>
            <div className={styles.lottieWrapper}>
              <DotLottieReact
                src="https://lottie.host/5a06233e-21c6-45dc-ac6f-0b6f59b143a2/wzFpW8re8y.lottie"
                loop
                autoplay
              />
            </div>

            <div key={`tagline-${mode}`} className={styles.tagline}>
              <h2 className={styles.taglineTitle}>{tagline.title}</h2>
              <p className={styles.taglineText}>{tagline.text}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
