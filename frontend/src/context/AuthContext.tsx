import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { authService } from '../services/authService';
import type { AuthUser, LoginPayload, DoctorSignupPayload, PatientSignupPayload } from '../types/auth';

const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'auth_user';

type ApiError = { response?: { data?: { message?: string } } };

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<AuthUser | null>;
  signupDoctor: (payload: DoctorSignupPayload) => Promise<AuthUser | null>;
  signupPatient: (payload: PatientSignupPayload) => Promise<AuthUser | null>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const s = localStorage.getItem(USER_KEY);
      return s ? (JSON.parse(s) as AuthUser) : null;
    } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => () => { isMounted.current = false; }, []);

  const handleAuth = useCallback(
    async (call: () => Promise<{ token: string; user: AuthUser }>, fallback: string): Promise<AuthUser | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const { token, user } = await call();
        console.log('Auth response:', { token, user });
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setUser(user);
        console.log('User persisted, returning:', user);
        return user;
      } catch (err) {
        console.error('Auth error:', err);
        const msg = (err as ApiError)?.response?.data?.message ?? fallback;
        if (isMounted.current) setError(msg);
        return null;
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    []
  );

  const login         = useCallback((p: LoginPayload) =>
    handleAuth(() => authService.login(p), 'Login failed. Please check your credentials.'), [handleAuth]);

  const signupDoctor  = useCallback((p: DoctorSignupPayload) =>
    handleAuth(() => authService.signupDoctor(p), 'Sign up failed. Please try again.'), [handleAuth]);

  const signupPatient = useCallback((p: PatientSignupPayload) =>
    handleAuth(() => authService.signupPatient(p), 'Sign up failed. Please try again.'), [handleAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, signupDoctor, signupPatient, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
};
