import api from './index';

export interface Categories {
  income: string[];
  expense: string[];
  investment: string[];
  savings: string[];
}

export const categoriesApi = {
  // Get user's custom categories
  getCategories: async (): Promise<Categories> => {
    const response = await api.get('/categories');
    return response.data;
  },

  // Add a category to a specific type
  addCategory: async (categoryType: keyof Categories, category: string): Promise<Categories> => {
    const response = await api.post('/categories/add', { categoryType, category });
    return response.data;
  },

  // Remove a category from a specific type
  removeCategory: async (categoryType: keyof Categories, category: string): Promise<Categories> => {
    const response = await api.post('/categories/remove', { categoryType, category });
    return response.data;
  },

  // Update all categories at once
  updateCategories: async (categories: Categories): Promise<Categories> => {
    const response = await api.put('/categories', { categories });
    return response.data;
  },
};

