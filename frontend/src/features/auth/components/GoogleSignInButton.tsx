import React, { useEffect, useRef, useCallback } from 'react';

const GOOGLE_CLIENT_ID =
  '281196883998-brdb6h03e0uhksr2go7fbfgm7nddu0i7.apps.googleusercontent.com';

/* ── Load the Google Identity Services script once ── */
let gsiPromise: Promise<void> | null = null;

function loadGSI(): Promise<void> {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.accounts?.id) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { gsiPromise = null; reject(new Error('Failed to load Google Sign-In')); };
    document.head.appendChild(script);
  });
  return gsiPromise;
}

interface Props {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<Props> = ({ onCredential, text = 'continue_with', disabled }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef  = useRef(onCredential);
  callbackRef.current = onCredential;                // keep stable

  const stableCallback = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (response: any) => callbackRef.current(response.credential),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    loadGSI()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: stableCallback,
          auto_select: false,
        });
        google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          width: containerRef.current.offsetWidth || 320,
          logo_alignment: 'left',
        });
      })
      .catch((err: unknown) => console.warn('[GoogleSignIn]', err));

    return () => { cancelled = true; };
  }, [text, stableCallback]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: 44,
        display: 'flex',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    />
  );
};
