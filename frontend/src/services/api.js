import axios from 'axios';

import { API_BASE_URL, assetUrl as buildAssetUrl } from '../config';

export const assetUrl = buildAssetUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
});

export function getApiError(err, fallback = 'Request failed. Please try again.') {
  const data = err.response?.data;
  if (!data) return fallback;
  if (Array.isArray(data.details) && data.details.length > 0) {
    return data.details.join(' ');
  }
  return data.error || fallback;
}

// ─── Request Interceptor: attach JWT token ────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary. A hard-coded Content-Type
  // of "multipart/form-data" (no boundary) makes multer reject the upload.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  } else if (!config.headers['Content-Type'] && !config.headers['content-type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// ─── Response Interceptor: handle 401 ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/files/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────
export const authService = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  register: (data) =>
    api.post('/auth/register', data),

  verifyToken: () =>
    api.get('/auth/verify'),

  getMe: () =>
    api.get('/auth/me'),
};

// ─── Students ─────────────────────────────────────────────────
export const studentService = {
  // Get own profile info + clearance summary
  getMyInfo: () => api.get('/students/my-info'),

  // Update name, email, or password
  updateProfile: (data) => api.put('/students/my-profile', data),

  // Upload profile picture (FormData with 'avatar' field)
  uploadAvatar: (formData) => api.post('/students/my-avatar', formData),

  getAll: () =>
    api.get('/students'),

  getById: (id) =>
    api.get(`/students/${id}`),

  getPayments: (id) =>
    api.get(`/students/${id}/payments`),
};

// ─── Payments ─────────────────────────────────────────────────
export const paymentService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/payments${params ? '?' + params : ''}`);
  },

  getById: (id) =>
    api.get(`/payments/${id}`),

  getByStudent: (studentId) =>
    api.get(`/payments/student/${studentId}`),

  create: (data) =>
    api.post('/payments', data),
};

// ─── Clearances ───────────────────────────────────────────────
export const clearanceService = {
  // Student: submit a clearance request (multipart/form-data)
  submitRequest: (formData) => api.post('/clearances/request', formData),

  // Student: get own requests
  getMyRequests: () =>
    api.get('/clearances/my-requests'),

  // Admin: get all pending requests
  getPending: () =>
    api.get('/clearances/pending'),

  // Admin: get specific request
  getRequest: (id) =>
    api.get(`/clearances/requests/${id}`),

  // Admin: get full details (with payment summary)
  getRequestDetails: (id) =>
    api.get(`/clearances/requests/${id}/details`),

  // Admin: approve request
  approve: (id) =>
    api.patch(`/clearances/requests/${id}/approve`, {}),

  // Admin: reject request
  reject: (id, reason) =>
    api.patch(`/clearances/requests/${id}/reject`, { reason }),

  getCertificateUrl: (pathOrFilename) => {
    const path = pathOrFilename?.includes('/')
      ? pathOrFilename
      : `/uploads/certificates/${pathOrFilename}`;
    return assetUrl(path);
  },
};

export const ledgerService = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/ledger${qs ? '?' + qs : ''}`);
  },

  record: (data) => api.post('/ledger', data),

  getById: (id) => api.get(`/ledger/${id}`),
};

export const studentAdminService = {
  updateIndigene: (id, isIndigene) =>
    api.patch(`/students/${id}/indigene`, { is_indigene: isIndigene }),
};

export default api;
