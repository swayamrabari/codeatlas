import api from './index';

export interface Feedback {
  _id: string;
  type: 'issue' | 'review' | 'feature-request' | 'bug-report' | 'feedback';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'new' | 'read' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackRequest {
  type: 'issue' | 'review' | 'feature-request' | 'bug-report' | 'feedback';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export const feedbackApi = {
  createFeedback: async (data: CreateFeedbackRequest) => {
    const response = await api.post<{ feedback: Feedback }>('/feedback', data);
    return response.data;
  },

  getUserFeedback: async () => {
    const response = await api.get<{ feedback: Feedback[] }>('/feedback');
    return response.data;
  },
};

