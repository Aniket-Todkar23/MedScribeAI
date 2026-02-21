import React, { useState } from 'react';
import styles from '../auth.module.css';

interface SignupFormProps {
  onSubmit: (name: string, email: string, password: string) => void;
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
  <span className={styles.loadingDots}>
    <span className={styles.dot} />
    <span className={styles.dot} />
    <span className={styles.dot} />
  </span>
);

export const SignupForm: React.FC<SignupFormProps> = ({
  onSubmit,
  onToggle,
  isLoading,
  error,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setLocalError("Passwords don't match.");
      return;
    }
    setLocalError('');
    onSubmit(name, email, password);
  };

  const displayError = localError || error;

  return (
    <div className={styles.formInner}>
      {/* Logo */}
      <div className={styles.logoMark}>
        <svg viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="38" height="38" rx="10" fill="#6366f1" />
          <path
            d="M10 19L16.5 25.5L28 12.5"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Header */}
      <div className={styles.formHeader}>
        <h1 className={styles.formTitle}>Create an account</h1>
        <p className={styles.formSubtitle}>Get started — it only takes a minute.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Full name</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            autoFocus
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Email address</label>
          <input
            type="email"
            className={styles.input}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Password</label>
          <div className={styles.inputWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              className={`${styles.input} ${styles.inputWithIcon}`}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Confirm password</label>
          <input
            type="password"
            className={styles.input}
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        {displayError && (
          <p className={styles.errorMsg} role="alert">
            {displayError}
          </p>
        )}

        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
          {isLoading ? <LoadingDots /> : 'Create account'}
        </button>
      </form>

      <p className={styles.toggleText}>
        Already have an account?{' '}
        <button type="button" className={styles.toggleBtn} onClick={onToggle}>
          Sign in
        </button>
      </p>
    </div>
  );
};
