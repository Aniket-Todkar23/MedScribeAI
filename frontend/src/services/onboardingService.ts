import axios from 'axios';
import type { OnboardingData } from '../types/onboarding';

const API_BASE =
  (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_API_URL ??
  'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const onboardingService = {
  saveOnboarding: (data: OnboardingData) =>
    api.post('/onboarding', data).then((r) => r.data),

  getOnboarding: () =>
    api.get('/onboarding').then((r) => r.data),
};
