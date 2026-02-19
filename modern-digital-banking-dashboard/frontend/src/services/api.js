import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ✅ Single axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ===============================
   REQUEST INTERCEPTOR
================================ */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);



/* ===============================
   AUTH API
================================ */
export const authAPI = {
  login: (formData) =>
  api.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }),
  register: (data) => api.post('/auth/register', data),
  logout: () => Promise.resolve(), // frontend-only logout
  refresh: (token) => api.post('/auth/refresh', { refresh_token: token }),
  getProfile: () => api.get('/auth/me'),
};

/* ===============================
   ACCOUNTS API
================================ */
export const accountsAPI = {
  getAll: () => api.get('/accounts/'),
  getById: (id) => api.get(`/accounts/${id}/`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  getBalance: () => api.get('/accounts/balance'),
};

/* ===============================
   TRANSACTIONS API
================================ */
export const transactionsAPI = {
  getAll: (params) => api.get('/transactions/', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  categorize: (id, data) =>
    api.post(`/transactions/${id}/categorize`, data),
  getSummary: () => api.get('/transactions/summary'),
};

/* ===============================
   BUDGETS API
================================ */
export const budgetsAPI = {
  getAll: () => api.get('/budgets/'),
  getById: (id) => api.get(`/budgets/${id}/`),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
  getSummary: () => api.get('/budgets/summary'),
  getProgress: () => api.get('/budgets/progress'),
};

/* ===============================
   CATEGORIES API
================================ */
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

/* ===============================
   BILLS API (Milestone 3)
================================ */
export const billsAPI = {
  getAll: (params) => api.get('/bills', { params }),
  getById: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post('/bills', data),
  update: (id, data) => api.put(`/bills/${id}`, data),
  delete: (id) => api.delete(`/bills/${id}`),
  markAsPaid: (id) => api.post(`/bills/${id}/pay`),
  getDueSoon: (days = 7) =>
    api.get(`/bills/summary/due-soon`, { params: { days } }),
  getMonthlySummary: (month, year) =>
    api.get('/bills/summary/monthly', { params: { month, year } }),
  getOverdue: () =>
    api.get('/bills/summary/due-soon', { params: { days: -30 } }),
};

/* ===============================
   REWARDS API (Milestone 3)
================================ */
export const rewardsAPI = {
  getAll: (params) => api.get('/rewards', { params }),
  getById: (id) => api.get(`/rewards/${id}`),
  create: (data) => api.post('/rewards', data),
  getSummary: () => api.get('/rewards/summary'),
  getLeaderboard: (period = 'monthly', limit = 10) =>
    api.get('/rewards/leaderboard', { params: { period, limit } }),
  getTiers: () => api.get('/rewards/tiers'),
  getStreak: () => api.get('/rewards/streak'),
  toggleFavorite: (id, isFavorite) =>
    api.patch(`/rewards/${id}/favorite`, { is_favorite: isFavorite }),
};

export const setAuthHeaderFromStorage = () => {
  const token = localStorage.getItem('access_token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export default api;
