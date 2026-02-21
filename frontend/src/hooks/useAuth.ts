import { useState, useCallback, useRef, useEffect } from 'react';
import { authService } from '../services/authService';
import type { AuthUser, LoginPayload, SignupPayload } from '../types/auth';

const TOKEN_KEY = 'auth_token';

type ApiError = { response?: { data?: { message?: string } } };

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Restore user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        localStorage.removeItem('user');
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }, []);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { token, user } = await authService.login(payload);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('user', JSON.stringify(user));
      if (isMounted.current) setUser(user);
      return true;
    } catch (err) {
      const msg =
        (err as ApiError)?.response?.data?.message ??
        'Login failed. Please check your credentials.';
      if (isMounted.current) setError(msg);
      return false;
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (payload: SignupPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { token, user } = await authService.signup(payload);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('user', JSON.stringify(user));
      if (isMounted.current) setUser(user);
      return true;
    } catch (err) {
      const msg =
        (err as ApiError)?.response?.data?.message ??
        'Sign up failed. Please try again.';
      if (isMounted.current) setError(msg);
      return false;
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem('needs_onboarding');
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { user, isLoading, error, login, signup, logout, clearError };
};
