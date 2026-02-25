import api from './index';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'thinking';
  content: string;
  timestamp: Date | string;
}

export interface ChatSession {
  _id?: string;
  id?: string;
  title: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  messages: ChatMessage[];
}

export const chatApi = {
  // Get all chat sessions for the current user
  getSessions: async (): Promise<ChatSession[]> => {
    const response = await api.get('/chat');
    return response.data;
  },

  // Get a specific chat session with all messages
  getSession: async (sessionId: string): Promise<ChatSession> => {
    const response = await api.get(`/chat/${sessionId}`);
    return response.data;
  },

  // Create a new chat session
  createSession: async (title?: string): Promise<ChatSession> => {
    const response = await api.post('/chat', { title: title || 'New Chat' });
    return response.data;
  },

  // Update a chat session
  updateSession: async (
    sessionId: string,
    data: { title?: string; messages?: ChatMessage[] }
  ): Promise<ChatSession> => {
    const response = await api.put(`/chat/${sessionId}`, data);
    return response.data;
  },

  // Delete a chat session
  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/chat/${sessionId}`);
  },
};

