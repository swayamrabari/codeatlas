import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  (error) => Promise.reject(error),
);

export const authAPI = {
  /**
   * Register a new user
   */
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  /**
   * Verify email with 6-digit code
   */
  verifyEmail: async (email, code) => {
    const response = await api.post('/auth/verify-email', { email, code });
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
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
    const response = await api.post('/auth/resend-code', { email });
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
   * Get project analysis data (includes file list + features + relationships)
   */
  getProject: async (id) => {
    const response = await api.get(`/project/${id}`);
    return response.data;
  },

  /**
   * Get lightweight file list (no content) for Explorer sidebar
   */
  getFileList: async (id) => {
    const response = await api.get(`/project/${id}/files`);
    return response.data;
  },

  /**
   * Get raw source file content for a file within a project.
   * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the request
   */
  getFileContent: async (id, filePath, signal) => {
    const response = await api.get(`/project/${id}/file`, {
      params: { path: filePath },
      signal,
    });
    return response.data;
  },

  /**
   * Get features for a project
   */
  getFeatures: async (id) => {
    const response = await api.get(`/project/${id}/features`);
    return response.data;
  },

  /**
   * Get a single feature with populated file references
   */
  getFeatureDetail: async (id, keyword) => {
    const response = await api.get(`/project/${id}/features/${keyword}`);
    return response.data;
  },

  /**
   * Delete a project and all associated data
   */
  deleteProject: async (id) => {
    const response = await api.delete(`/project/${id}`);
    return response.data;
  },
};

export default api;
