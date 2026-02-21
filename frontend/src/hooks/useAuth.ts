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

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { token, user } = await authService.login(payload);
      localStorage.setItem(TOKEN_KEY, token);
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
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { user, isLoading, error, login, signup, logout, clearError };
};
