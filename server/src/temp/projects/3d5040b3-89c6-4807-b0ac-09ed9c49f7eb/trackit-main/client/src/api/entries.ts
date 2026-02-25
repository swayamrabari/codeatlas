import api from './index';

export interface Entry {
  _id?: string;
  id?: string;
  type: 'income' | 'expense' | 'investment' | 'savings';
  amount: number;
  category: string;
  date: string | Date;
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export const entriesApi = {
  // Get all entries for the current user
  getEntries: async (): Promise<Entry[]> => {
    const response = await api.get('/entries');
    return response.data;
  },

  // Get a specific entry
  getEntry: async (entryId: string): Promise<Entry> => {
    const response = await api.get(`/entries/${entryId}`);
    return response.data;
  },

  // Create a new entry
  createEntry: async (entry: Omit<Entry, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<Entry> => {
    const response = await api.post('/entries', entry);
    return response.data;
  },

  // Update an entry
  updateEntry: async (entryId: string, updates: Partial<Entry>): Promise<Entry> => {
    const response = await api.put(`/entries/${entryId}`, updates);
    return response.data;
  },

  // Delete an entry
  deleteEntry: async (entryId: string): Promise<void> => {
    await api.delete(`/entries/${entryId}`);
  },
};

