import api from './index';

export interface Budget {
  _id?: string;
  id?: string;
  type: 'expense' | 'investment' | 'savings';
  category: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export const budgetsApi = {
  // Get all budgets for the current user
  getBudgets: async (): Promise<Budget[]> => {
    const response = await api.get('/budgets');
    return response.data;
  },

  // Get a specific budget
  getBudget: async (budgetId: string): Promise<Budget> => {
    const response = await api.get(`/budgets/${budgetId}`);
    return response.data;
  },

  // Create a new budget
  createBudget: async (budget: Omit<Budget, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget> => {
    const response = await api.post('/budgets', budget);
    return response.data;
  },

  // Update a budget
  updateBudget: async (budgetId: string, updates: Partial<Budget>): Promise<Budget> => {
    const response = await api.put(`/budgets/${budgetId}`, updates);
    return response.data;
  },

  // Delete a budget
  deleteBudget: async (budgetId: string): Promise<void> => {
    await api.delete(`/budgets/${budgetId}`);
  },
};

