import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const PUBLIC_PROJECT_ID =
  import.meta.env.VITE_PUBLIC_PROJECT_ID || '69a7ead0e60d8f73871a5801';
export const AUTH_FORCED_LOGOUT_EVENT = 'codeatlas:auth-forced-logout';
export const AUTH_NOTICE_STORAGE_KEY = 'auth_notice';

let forcedLogoutDispatched = false;

function isBlockedErrorPayload(payload) {
  return payload?.blocked === true || payload?.code === 'ACCOUNT_BLOCKED';
}

function persistAuthNotice(notice) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(AUTH_NOTICE_STORAGE_KEY, JSON.stringify(notice));
  } catch {
    // Ignore storage errors in restricted environments.
  }
}

function dispatchForcedLogoutEvent(payload = {}) {
  if (typeof window === 'undefined' || forcedLogoutDispatched) return;

  forcedLogoutDispatched = true;
  localStorage.removeItem('token');

  const notice = {
    type: 'blocked',
    code: payload.code || 'ACCOUNT_BLOCKED',
    message:
      payload.error || 'Your account has been blocked. Please contact support.',
    reason: payload.blockReason || null,
    at: new Date().toISOString(),
  };

  persistAuthNotice(notice);
  window.dispatchEvent(
    new CustomEvent(AUTH_FORCED_LOGOUT_EVENT, {
      detail: notice,
    }),
  );
}

export function resetAuthForcedLogoutSignal() {
  forcedLogoutDispatched = false;
}

export function handleAuthBlock(status, payload = {}) {
  if (status === 403 && isBlockedErrorPayload(payload)) {
    dispatchForcedLogoutEvent(payload);
    return true;
  }

  return false;
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 minutes
});

// Attach JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const payload = error?.response?.data || {};
    handleAuthBlock(status, payload);
    return Promise.reject(error);
  },
);

export const authAPI = {
  /**
   * Register a new user
   */
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', {
      name,
      email: String(email || '')
        .trim()
        .toLowerCase(),
      password,
    });
    return response.data;
  },

  /**
   * Verify email with 6-digit code
   */
  verifyEmail: async (email, code) => {
    const response = await api.post('/auth/verify-email', {
      email: String(email || '')
        .trim()
        .toLowerCase(),
      code,
    });
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email: String(email || '')
        .trim()
        .toLowerCase(),
      password,
    });
    return response.data;
  },

  /**
   * Get current authenticated user
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Resend verification code
   */
  resendCode: async (email) => {
    const response = await api.post('/auth/resend-code', {
      email: String(email || '')
        .trim()
        .toLowerCase(),
    });
    return response.data;
  },

  /**
   * Request a password reset OTP
   */
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', {
      email: String(email || '')
        .trim()
        .toLowerCase(),
    });
    return response.data;
  },

  /**
   * Verify password reset OTP
   */
  verifyResetCode: async (email, code) => {
    const response = await api.post('/auth/verify-reset-code', {
      email: String(email || '')
        .trim()
        .toLowerCase(),
      code,
    });
    return response.data;
  },

  /**
   * Reset password with email + OTP + new password
   */
  resetPassword: async (email, code, password) => {
    const response = await api.post('/auth/reset-password', {
      email: String(email || '')
        .trim()
        .toLowerCase(),
      code,
      password,
    });
    return response.data;
  },
};

export const projectAPI = {
  /**
   * Upload a ZIP file for analysis
   */
  uploadZip: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('project', file);
    const response = await api.post('/upload', formData, {
      onUploadProgress,
      timeout: 120000,
    });
    return response.data;
  },

  /**
   * Clone and analyze a Git repository
   */
  uploadGit: async (gitUrl) => {
    const response = await api.post(
      '/upload-git',
      { gitUrl },
      {
        timeout: 120000,
      },
    );
    return response.data;
  },

  /**
   * List all projects for the current user
   */
  listProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },

  /**
   * Suggest users by stored email for sharing.
   */
  getShareSuggestions: async (query = '') => {
    const response = await api.get('/projects/share/suggestions', {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * Get current share settings for a project (owner only).
   */
  getProjectShares: async (id) => {
    const response = await api.get(`/projects/${id}/share`);
    return response.data;
  },

  /**
   * Update project share list (owner only).
   */
  updateProjectShares: async (id, emails = []) => {
    const response = await api.patch(`/projects/${id}/share`, {
      emails,
    });
    return response.data;
  },

  /**
   * Get project analysis data (includes file list + features + relationships)
   */
  getProject: async (id) => {
    const response = await api.get(`/projects/${id}/insights`);
    return response.data;
  },

  /**
   * Get overview page data.
   */
  getOverviewPage: async (id) => {
    const response = await api.get(`/projects/${id}/overview`);
    return response.data;
  },

  /**
   * Get insights page data.
   */
  getInsightsPage: async (id) => {
    const response = await api.get(`/projects/${id}/insights`);
    return response.data;
  },

  /**
   * Get files page data (lightweight file metadata only).
   */
  getFilesPage: async (id) => {
    const response = await api.get(`/projects/${id}/files`);
    return response.data;
  },

  /**
   * Get source page file list.
   */
  getSourceFileList: async (id) => {
    const response = await api.get(`/projects/${id}/source/files`);
    return response.data;
  },

  /**
   * Lightweight status poll — returns { status, name, totalFiles, featureCount }
   */
  getProjectStatus: async (id) => {
    const response = await api.get(`/projects/${id}/status`);
    return response.data;
  },

  /**
   * Public lightweight status poll.
   */
  getPublicProjectStatus: async (id) => {
    const response = await api.get(`/public/projects/${id}/status`);
    return response.data;
  },

  /**
   * Get full AI documentation (project overview + features with docs + nested files)
   */
  getProjectDocs: async (id) => {
    const response = await api.get(`/projects/${id}/overview`);
    return response.data;
  },

  /**
   * Public overview page data.
   */
  getPublicOverviewPage: async (id) => {
    const response = await api.get(`/public/projects/${id}/overview`);
    return response.data;
  },

  /**
   * Public insights page data.
   */
  getPublicInsightsPage: async (id) => {
    const response = await api.get(`/public/projects/${id}/insights`);
    return response.data;
  },

  /**
   * Public files page data.
   */
  getPublicFilesPage: async (id) => {
    const response = await api.get(`/public/projects/${id}/files`);
    return response.data;
  },

  /**
   * Public source file list.
   */
  getPublicSourceFileList: async (id) => {
    const response = await api.get(`/public/projects/${id}/source/files`);
    return response.data;
  },

  /**
   * Public source file content.
   */
  getPublicSourceFileContent: async (id, filePath, signal) => {
    const response = await api.get(`/public/projects/${id}/source/file`, {
      params: { path: filePath },
      signal,
    });
    return response.data;
  },

  /**
   * Ask a grounded question against project embeddings.
   */
  askProjectQuestion: async (id, question, history = [], chatId = null) => {
    const response = await api.post(`/projects/${id}/ask`, {
      question,
      history,
      chatId,
    });
    return response.data;
  },

  /**
   * Stream a grounded answer via SSE. Uses native fetch (not Axios)
   * so we can read the response body as a stream.
   * Returns the raw Response object.
   */
  askProjectQuestionStream: async (
    id,
    question,
    history = [],
    chatId = null,
  ) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/projects/${id}/ask/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question, history, chatId }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      handleAuthBlock(response.status, errorBody);
      throw {
        response: {
          data: errorBody,
          status: response.status,
        },
      };
    }

    return response;
  },

  /**
   * Stream a grounded answer for public demo project (no auth required).
   */
  askPublicProjectQuestionStream: async (id, question, history = []) => {
    const response = await fetch(
      `${API_URL}/public/projects/${id}/ask/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, history }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw {
        response: {
          data: errorBody,
          status: response.status,
        },
      };
    }

    return response;
  },

  /**
   * List persisted chats for a project.
   */
  listProjectChats: async (id) => {
    const response = await api.get(`/projects/${id}/ask/chats`);
    return response.data;
  },

  /**
   * Get a single persisted chat with message history.
   */
  getProjectChat: async (id, chatId) => {
    const response = await api.get(`/projects/${id}/ask/chats/${chatId}`);
    return response.data;
  },

  /**
   * Rename a persisted chat.
   */
  renameProjectChat: async (id, chatId, title) => {
    const response = await api.patch(`/projects/${id}/ask/chats/${chatId}`, {
      title,
    });
    return response.data;
  },

  /**
   * Delete a persisted chat.
   */
  deleteProjectChat: async (id, chatId) => {
    const response = await api.delete(`/projects/${id}/ask/chats/${chatId}`);
    return response.data;
  },

  /**
   * Get lightweight file list (no content) for Explorer sidebar
   */
  getFileList: async (id) => {
    const response = await api.get(`/projects/${id}/files`);
    return response.data;
  },

  /**
   * Get raw source file content for a file within a project.
   * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the request
   */
  getFileContent: async (id, filePath, signal) => {
    const response = await api.get(`/projects/${id}/source/file`, {
      params: { path: filePath },
      signal,
    });
    return response.data;
  },

  /**
   * Get raw source file content for source page.
   */
  getSourceFileContent: async (id, filePath, signal) => {
    const response = await api.get(`/projects/${id}/source/file`, {
      params: { path: filePath },
      signal,
    });
    return response.data;
  },

  /**
   * Get features for a project
   */
  getFeatures: async (id) => {
    const response = await api.get(`/projects/${id}/files/features`);
    return response.data;
  },

  /**
   * Get a single feature with populated file references
   */
  getFeatureDetail: async (id, keyword) => {
    const response = await api.get(`/projects/${id}/files/features/${keyword}`);
    return response.data;
  },

  /**
   * Delete a project and all associated data
   */
  deleteProject: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  // ── Selective Doc Regeneration ──

  /**
   * Regenerate docs for a single file
   */
  regenerateFileDoc: async (projectId, filePath) => {
    const response = await api.post(
      `/projects/${projectId}/overview/regenerate/file`,
      {
        filePath,
      },
    );
    return response.data;
  },

  /**
   * Regenerate docs for a single file (overview page alias)
   */
  regenerateOverviewFileDoc: async (projectId, filePath) => {
    const response = await api.post(
      `/projects/${projectId}/overview/regenerate/file`,
      {
        filePath,
      },
    );
    return response.data;
  },

  /**
   * Regenerate docs for a single feature
   */
  regenerateFeatureDoc: async (projectId, keyword) => {
    const response = await api.post(
      `/projects/${projectId}/overview/regenerate/feature`,
      { keyword },
    );
    return response.data;
  },

  /**
   * Regenerate project overview docs
   */
  regenerateProjectDoc: async (projectId) => {
    const response = await api.post(
      `/projects/${projectId}/overview/regenerate`,
    );
    return response.data;
  },

  /**
   * Ask endpoint alias with page-oriented route naming.
   */
  askOnAskPage: async (id, question, history = [], chatId = null) => {
    const response = await api.post(`/projects/${id}/ask`, {
      question,
      history,
      chatId,
    });
    return response.data;
  },
};

export const adminAPI = {
  /**
   * Fetch global admin dashboard statistics.
   */
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  /**
   * Fetch all users with admin counters.
   */
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  /**
   * Send admin notification email to user.
   */
  notifyUser: async (userId, subject, message) => {
    const response = await api.post(`/admin/users/${userId}/notify`, {
      subject,
      message,
    });
    return response.data;
  },

  /**
   * Block or unblock a user.
   */
  setUserBlocked: async (userId, blocked, reason = '') => {
    const response = await api.patch(`/admin/users/${userId}/block`, {
      blocked,
      reason,
    });
    return response.data;
  },

  /**
   * Permanently remove a user and associated data.
   */
  removeUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
};

export default api;
