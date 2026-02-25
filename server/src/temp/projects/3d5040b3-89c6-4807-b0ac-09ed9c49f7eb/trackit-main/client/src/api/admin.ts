import api from './index';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  counts: {
    entries: number;
    budgets: number;
    chats: number;
  };
}

export interface DashboardStats {
  totalUsers: number;
  totalEntries: number;
  totalBudgets: number;
  totalChats: number;
}

export interface AdminStatsResponse {
  stats: DashboardStats;
}

export interface Feedback {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  type: 'issue' | 'review' | 'feature-request' | 'bug-report' | 'feedback';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'new' | 'read' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export const adminApi = {
  getAllUsers: async () => {
    const response = await api.get<{ users: User[] }>('/admin/users');
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get<AdminStatsResponse>('/admin/stats');
    return response.data;
  },

  getAllFeedback: async () => {
    const response = await api.get<{ feedback: Feedback[] }>('/admin/feedback');
    return response.data;
  },

  updateFeedbackStatus: async (feedbackId: string, status: string) => {
    const response = await api.put<{ feedback: Feedback }>(
      `/admin/feedback/${feedbackId}/status`,
      { status }
    );
    return response.data;
  },
};

