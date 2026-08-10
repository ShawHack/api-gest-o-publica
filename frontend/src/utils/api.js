import axios from 'axios';
import { readStoredToken } from './readStoredToken';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const fromScript = window.__API_BASE__;
    if (fromScript !== undefined) return String(fromScript).replace(/\/+$/, '');
    const isLocal = /^localhost$|^127\.0\.0\.1$|^192\.168\.|^10\./.test(window.location.hostname || '') || window.location.port === '5000';
    if (isLocal) return '';
  }
  return (process.env.REACT_APP_API || '/api').replace(/\/+$/, '');
};

const api = axios.create({ baseURL: getBaseURL() });

api.interceptors.request.use((config) => {
  config.baseURL = getBaseURL();
  const token = readStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const s = err?.response?.status;
    if (s) console.debug('[API ERR]', s, err?.response?.data);
    if (
      s === 401 &&
      typeof window !== 'undefined' &&
      window.location.pathname.includes('/educacao/admin')
    ) {
      window.dispatchEvent(new CustomEvent('education-admin-unauthorized', {
        detail: err?.response?.data,
      }));
    }
    return Promise.reject(err);
  }
);

export default api;
