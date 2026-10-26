import axios from 'axios';
import { appPath, isLoginPath } from '../utils/appPath';
import { saveAuthNotice, tenantSuspendedMessage } from '../utils/authNotice';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('access_token');
      // Clínica suspensa no meio da sessão: o login explica o motivo
      const suspended = tenantSuspendedMessage(err);
      if (suspended) saveAuthNotice(suspended);
      if (!isLoginPath()) {
        window.location.href = appPath('/login');
      }
    }
    return Promise.reject(err);
  },
);
