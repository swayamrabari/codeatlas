import api from './index';
export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  token: string;
}

export interface RegisterResponse {
  message: string;
}

export interface verifyOtpResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  token: string;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  register: async (name: string, email: string, password: string) => {
    const response = await api.post<RegisterResponse>('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  verifyOtp: async (email: string, otp: string) => {
    const response = await api.post<verifyOtpResponse>('/auth/verify-otp', {
      email,
      otp,
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getAllUserData: async () => {
    const response = await api.get('/auth/data');
    return response.data;
  },

  // Password reset (forgot password)
  requestPasswordResetOtp: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyPasswordResetOtp: async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-password-reset-otp', {
      email,
      otp,
    });
    return response.data;
  },

  resetPassword: async (email: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', {
      email,
      password: newPassword,
    });
    return response.data;
  },
};
