/**
 * API client for DeepTrace backend.
 * Handles authentication tokens, request/response formatting, and error handling.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = 'ApiError';
  }
}

function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

async function apiRequest<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, isFormData = false } = options;

  const token = getAccessToken();
  const requestHeaders: Record<string, string> = { ...headers };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData && body) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  let response = await fetch(`${API_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (response.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      requestHeaders['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(`${API_URL}${path}`, {
        method,
        headers: requestHeaders,
        body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!response.ok) {
    let detail = 'An error occurred';
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || detail;
    } catch {}
    throw new ApiError(response.status, detail);
  }

  return response.json();
}

// ─── Auth API ──────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string, full_name: string) =>
    apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: { email, password, full_name },
    }),

  login: (email: string, password: string) =>
    apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  getProfile: () => apiRequest('/api/v1/auth/me'),

  updateProfile: (data: { full_name?: string; email?: string }) =>
    apiRequest('/api/v1/auth/me', { method: 'PUT', body: data }),

  deleteAccount: () =>
    apiRequest('/api/v1/auth/me', { method: 'DELETE' }),

  requestPasswordReset: (email: string) =>
    apiRequest('/api/v1/auth/password/reset-request', {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (token: string, new_password: string) =>
    apiRequest('/api/v1/auth/password/reset', {
      method: 'POST',
      body: { token, new_password },
    }),
};

// ─── Image API ─────────────────────────────────────────

export const imageApi = {
  predict: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('explain', 'true');
    return apiRequest('/api/v1/image/predict', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  getHistory: (page = 1, perPage = 20) =>
    apiRequest(`/api/v1/image/history?page=${page}&per_page=${perPage}`),

  getPrediction: (id: string) =>
    apiRequest(`/api/v1/image/history/${id}`),

  deletePrediction: (id: string) =>
    apiRequest(`/api/v1/image/history/${id}`, { method: 'DELETE' }),
};

// ─── Admin API ─────────────────────────────────────────

export const adminApi = {
  getStats: () => apiRequest('/api/v1/admin/stats'),
  
  getUsers: (page = 1, perPage = 20, search?: string) => {
    let url = `/api/v1/admin/users?page=${page}&per_page=${perPage}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return apiRequest(url);
  },

  getUser: (id: string) => apiRequest(`/api/v1/admin/users/${id}`),

  updateRole: (id: string, role: string) =>
    apiRequest(`/api/v1/admin/users/${id}/role`, {
      method: 'PUT',
      body: { role },
    }),

  updateStatus: (id: string, is_active: boolean) =>
    apiRequest(`/api/v1/admin/users/${id}/status`, {
      method: 'PUT',
      body: { is_active },
    }),

  getTrends: (days = 30) =>
    apiRequest(`/api/v1/admin/analytics/trends?days=${days}`),

  getAuditLogs: (page = 1, perPage = 50) =>
    apiRequest(`/api/v1/admin/audit-logs?page=${page}&per_page=${perPage}`),

  getActivity: (limit = 20) =>
    apiRequest(`/api/v1/admin/activity?limit=${limit}`),
};

export { ApiError, setTokens, clearTokens, getAccessToken };
