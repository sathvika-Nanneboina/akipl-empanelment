const BASE_URL = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (res.status === 401 && !url.includes('/auth/login')) {
    localStorage.clear();
    window.location.reload();
    throw new Error('Unauthorized');
  }
  return res;
};

export const api = {
  // Authentication
  login: async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.contractorProfileId) {
      localStorage.setItem('contractorProfileId', data.contractorProfileId);
    } else {
      localStorage.removeItem('contractorProfileId');
    }
    return data;
  },

  logout: async () => {
    try {
      await apiFetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getHeaders()
      });
    } catch (e) {}
    localStorage.clear();
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getContractorProfileId: () => {
    return localStorage.getItem('contractorProfileId');
  },

  // Applications
  getApplications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await apiFetch(`${BASE_URL}/applications?${query}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch applications');
    return res.json();
  },

  getApplicationById: async (id) => {
    const res = await apiFetch(`${BASE_URL}/applications/${id}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch application details');
    return res.json();
  },

  createDraft: async (companyName) => {
    const res = await apiFetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ companyName })
    });
    if (!res.ok) throw new Error('Failed to create application draft');
    return res.json();
  },

  updateApplication: async (id, data) => {
    const res = await apiFetch(`${BASE_URL}/applications/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to update application');
    }
    return res.json();
  },

  patchApplicationStatus: async (id, status, comments) => {
    const res = await apiFetch(`${BASE_URL}/applications/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, comments })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  deleteApplication: async (id) => {
    const res = await apiFetch(`${BASE_URL}/applications/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete application');
    return res.json();
  },

  // Document upload
  uploadDocument: async (contractorId, docType, file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('file', file);

    const res = await apiFetch(`${BASE_URL}/applications/${contractorId}/documents`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },

  // Evaluations
  submitEvaluation: async (id, evalData) => {
    const res = await apiFetch(`${BASE_URL}/applications/${id}/evaluate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(evalData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to submit evaluation');
    }
    return res.json();
  },

  getEvaluations: async (id) => {
    const res = await apiFetch(`${BASE_URL}/applications/${id}/evaluation`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch evaluations');
    return res.json();
  },

  getAuditTrail: async (id) => {
    const res = await apiFetch(`${BASE_URL}/applications/${id}/audit-trail`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch audit trail');
    return res.json();
  },

  // Vendors
  getVendors: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await apiFetch(`${BASE_URL}/vendors?${query}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch vendors');
    return res.json();
  },

  getVendorById: async (id) => {
    const res = await apiFetch(`${BASE_URL}/vendors/${id}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch vendor details');
    return res.json();
  },

  reEmpanel: async (id) => {
    const res = await apiFetch(`${BASE_URL}/applications/${id}/re-empanel`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to initiate re-empanelment');
    }
    return res.json();
  },

  // Analytics
  getAnalyticsSummary: async () => {
    const res = await apiFetch(`${BASE_URL}/analytics/summary`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch analytics summary');
    return res.json();
  },

  getAnalyticsTrends: async () => {
    const res = await apiFetch(`${BASE_URL}/analytics/trends`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch trends');
    return res.json();
  },

  getAnalyticsFunnel: async () => {
    const res = await apiFetch(`${BASE_URL}/analytics/funnel`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch funnel');
    return res.json();
  },

  getAnalyticsScores: async () => {
    const res = await apiFetch(`${BASE_URL}/analytics/scores`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch score distributions');
    return res.json();
  },

  // Notifications
  getNotifications: async () => {
    const res = await apiFetch(`${BASE_URL}/notifications`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  markNotificationRead: async (id) => {
    const res = await apiFetch(`${BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to mark notification as read');
    return res.json();
  },

  deleteNotification: async (id) => {
    const res = await apiFetch(`${BASE_URL}/notifications/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete notification');
    return res.json();
  },

  // Admin settings
  getAdminUsers: async () => {
    const res = await apiFetch(`${BASE_URL}/admin/users`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch admin users');
    return res.json();
  },

  createAdminUser: async (userData) => {
    const res = await apiFetch(`${BASE_URL}/admin/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create user');
    }
    return res.json();
  },

  toggleUserActive: async (id) => {
    const res = await apiFetch(`${BASE_URL}/admin/users/${id}/toggle-active`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to update user status');
    return res.json();
  },

  getScoringConfig: async () => {
    const res = await apiFetch(`${BASE_URL}/admin/config/weights`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch scoring weights');
    return res.json();
  },

  updateScoringConfig: async (weights) => {
    const res = await apiFetch(`${BASE_URL}/admin/config/weights`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(weights)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save weights config');
    }
    return res.json();
  },

  updateCategory: async (category, action) => {
    const res = await apiFetch(`${BASE_URL}/admin/config/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ category, action })
    });
    if (!res.ok) throw new Error('Failed to modify category');
    return res.json();
  },

  blacklistVendor: async (contractorId, action, reason) => {
    const res = await apiFetch(`${BASE_URL}/admin/blacklist`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ contractorId, action, reason })
    });
    if (!res.ok) throw new Error('Failed to update blacklist status');
    return res.json();
  },

  getAdminAuditLogs: async () => {
    const res = await apiFetch(`${BASE_URL}/admin/audit-logs`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  updateProfile: async (profileData) => {
    const res = await apiFetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to update profile');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  uploadAvatar: async (file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await apiFetch(`${BASE_URL}/auth/profile/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to upload avatar');
    }
    return res.json();
  },

  getExportUrl: () => {
    const token = localStorage.getItem('token');
    return `${BASE_URL}/admin/export?token=${token}`;
  }
};
