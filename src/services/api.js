import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8080/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartwaste_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to gracefully handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized on a protected route, clear stale token
      const isAuthRoute = error.config.url?.includes('/auth/login') || error.config.url?.includes('/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('smartwaste_token');
        localStorage.removeItem('smartwaste_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?session_expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
};

export const residentService = {
  createRequest: (data) => api.post('/pickup-requests', data),
  getMyRequests: (page = 0, size = 10) => api.get(`/pickup-requests/my?page=${page}&size=${size}`),
  getRequestById: (id) => api.get(`/pickup-requests/${id}`),
  updateRequest: (id, data) => api.put(`/pickup-requests/${id}`, data),
  cancelRequest: (id) => api.patch(`/pickup-requests/${id}/cancel`),
};

export const workerService = {
  getAssignedTasks: (status, page = 0, size = 10) => {
    const statusParam = status ? `&status=${status}` : '';
    return api.get(`/worker/tasks?page=${page}&size=${size}${statusParam}`);
  },
  getTaskById: (id) => api.get(`/worker/tasks/${id}`),
  updateTaskStatus: (id, data) => api.patch(`/worker/tasks/${id}/status`, data),
  getTaskHistory: (page = 0, size = 10) => api.get(`/worker/history?page=${page}&size=${size}`),
  getWorkerStats: () => api.get('/worker/stats'),
};

export const adminService = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getAllRequests: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.category) query.append('category', params.category);
    if (params.locality) query.append('locality', params.locality);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.search) query.append('search', params.search);
    query.append('page', params.page || 0);
    query.append('size', params.size || 10);
    return api.get(`/admin/pickup-requests?${query.toString()}`);
  },
  assignWorker: (requestId, data) => api.patch(`/admin/pickup-requests/${requestId}/assign`, data),
  getAllUsers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.role) query.append('role', params.role);
    if (params.active !== undefined && params.active !== '') query.append('active', params.active);
    query.append('page', params.page || 0);
    query.append('size', params.size || 10);
    return api.get(`/admin/users?${query.toString()}`);
  },
  createWorker: (data) => api.post('/admin/workers', data),
  updateUserStatus: (userId, active) => api.patch(`/admin/users/${userId}/status`, { active }),
  getActiveWorkers: () => api.get('/admin/workers/active'),
  getReports: (startDate, endDate) => {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    return api.get(`/admin/reports?${query.toString()}`);
  },
  exportCsvUrl: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.category) query.append('category', params.category);
    if (params.locality) query.append('locality', params.locality);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    return `${API_BASE_URL}/admin/reports/export?${query.toString()}`;
  },
  downloadCsv: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.category) query.append('category', params.category);
    if (params.locality) query.append('locality', params.locality);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    return api.get(`/admin/reports/export?${query.toString()}`, {
      responseType: 'blob',
    });
  }
};

export default api;
