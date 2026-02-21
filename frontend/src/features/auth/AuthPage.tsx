import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { useAuth } from '../../hooks/useAuth';
import styles from './auth.module.css';

type Mode = 'login' | 'signup';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [isExiting, setIsExiting] = useState(false);
  const isMounted = useRef(true);
  const { login, signup, isLoading, error, clearError } = useAuth();

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const handleToggle = useCallback(() => {
    if (isExiting) return;
    clearError();
    setIsExiting(true);
    setTimeout(() => {
      if (!isMounted.current) return;
      setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
      setIsExiting(false);
    }, 350);
  }, [isExiting, clearError]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login({ email, password });
    },
    [login]
  );

  const handleSignup = useCallback(
    async (name: string, email: string, password: string) => {
      await signup({ name, email, password });
    },
    [signup]
  );

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* ─── Left: Form Panel ─────────────────────────── */}
        <div className={styles.formPanel}>
          <div
            key={mode}
            className={`${styles.formContent} ${
              isExiting ? styles.formExit : styles.formEnter
            }`}
          >
            {mode === 'login' ? (
              <LoginForm
                onSubmit={handleLogin}
                onToggle={handleToggle}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <SignupForm
                onSubmit={handleSignup}
                onToggle={handleToggle}
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

            {/* Tagline fades in on every mode switch */}
            <div key={`tagline-${mode}`} className={styles.tagline}>
              {mode === 'login' ? (
                <>
                  <h2 className={styles.taglineTitle}>Good to see you again</h2>
                  <p className={styles.taglineText}>
                    Your health journey continues here.
                  </p>
                </>
              ) : (
                <>
                  <h2 className={styles.taglineTitle}>Start your journey</h2>
                  <p className={styles.taglineText}>
                    Join thousands managing their health smarter.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
