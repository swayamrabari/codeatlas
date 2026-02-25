import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { entriesApi, Entry as ApiEntry } from '../api/entries';
import { useAuthStore } from './authStore';

export interface Entry {
  id: string;
  _id?: string; // Database ID
  type: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
}

interface EntriesStore {
  entries: Entry[];
  isLoading: boolean;
  isSyncing: boolean;
  addEntry: (entry: Omit<Entry, 'id' | '_id'>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  updateEntry: (id: string, updatedEntry: Partial<Entry>) => Promise<void>;
  getEntries: () => Entry[];
  getEntriesByType: (type: Entry['type']) => Entry[];
  loadEntriesFromDatabase: () => Promise<void>;
  syncEntryToDatabase: (entryId: string) => Promise<void>;
}

const calculateMainEntries = (entries: Entry[]): Record<string, number> => {
  return entries.reduce(
    (acc: Record<string, number>, entry: Entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + entry.amount;
      return acc;
    },
    {} as Record<string, number>
  );
};

// Helper to convert API entry to store entry
const convertApiEntryToStore = (apiEntry: ApiEntry): Entry => {
  return {
    id: apiEntry._id || apiEntry.id || '',
    _id: apiEntry._id,
    type: apiEntry.type,
    category: apiEntry.category,
    amount: apiEntry.amount,
    date: typeof apiEntry.date === 'string' ? apiEntry.date : apiEntry.date.toISOString(),
    description: apiEntry.description,
  };
};

// Helper to convert store entry to API format
const convertStoreEntryToApi = (entry: Entry): Omit<ApiEntry, '_id' | 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    type: entry.type as ApiEntry['type'],
    category: entry.category,
    amount: entry.amount,
    date: new Date(entry.date),
    description: entry.description,
  };
};

export const useEntriesStore = create<
  EntriesStore & { mainEntries: Record<string, number> }
>()(
  persist(
    (set, get) => {
      return {
        mainEntries: {},
        entries: [],
        isLoading: false,
        isSyncing: false,

        loadEntriesFromDatabase: async () => {
          const { isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated) return;

          try {
            set({ isLoading: true });
            const apiEntries = await entriesApi.getEntries();
            const storeEntries = apiEntries.map(convertApiEntryToStore);
            const newMainEntries = calculateMainEntries(storeEntries);
            set({ entries: storeEntries, mainEntries: newMainEntries, isLoading: false });
          } catch (error) {
            set({ isLoading: false });
          }
        },

        syncEntryToDatabase: async (entryId: string) => {
          const { isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated) return;

          const state = get();
          const entry = state.entries.find((e) => e.id === entryId);
          if (!entry) return;

          try {
            set({ isSyncing: true });
            const apiEntry = convertStoreEntryToApi(entry);

            if (entry._id) {
              // Update existing entry
              const updated = await entriesApi.updateEntry(entry._id, apiEntry);
              const updatedStoreEntry = convertApiEntryToStore(updated);
              set((state) => ({
                entries: state.entries.map((e) =>
                  e.id === entryId ? updatedStoreEntry : e
                ),
                mainEntries: calculateMainEntries(state.entries.map((e) =>
                  e.id === entryId ? updatedStoreEntry : e
                )),
                isSyncing: false,
              }));
            }
          } catch (error) {
            set({ isSyncing: false });
          }
        },

        addEntry: async (entry) => {
          const { isAuthenticated } = useAuthStore.getState();
          const newEntry: Entry = { ...entry, id: crypto.randomUUID() };

          // Optimistically add to local store
          set((state) => {
            const newEntries = [newEntry, ...state.entries];
            const newMainEntries = calculateMainEntries(newEntries);
            return {
              entries: newEntries,
              mainEntries: newMainEntries,
            };
          });

          // Sync to database if authenticated
          if (isAuthenticated) {
            try {
              const apiEntry = convertStoreEntryToApi(newEntry);
              const created = await entriesApi.createEntry(apiEntry);
              const createdStoreEntry = convertApiEntryToStore(created);

              set((state) => ({
                entries: state.entries.map((e) =>
                  e.id === newEntry.id ? createdStoreEntry : e
                ),
                mainEntries: calculateMainEntries(state.entries.map((e) =>
                  e.id === newEntry.id ? createdStoreEntry : e
                )),
              }));
            } catch (error: any) {
              // Revert on error
              set((state) => {
                const newEntries = state.entries.filter((e) => e.id !== newEntry.id);
                return {
                  entries: newEntries,
                  mainEntries: calculateMainEntries(newEntries),
                };
              });
              // Re-throw error so caller knows it failed
              const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create entry in database';
              throw new Error(errorMessage);
            }
          }
        },

        removeEntry: async (id) => {
          const state = get();
          const entry = state.entries.find((e) => e.id === id);
          if (!entry) return;

          const { isAuthenticated } = useAuthStore.getState();

          // Optimistically remove from local store
          set((state) => {
            const newEntries = state.entries.filter((e) => e.id !== id);
            const newMainEntries = calculateMainEntries(newEntries);
            return {
              entries: newEntries,
              mainEntries: newMainEntries,
            };
          });

          // Delete from database if authenticated
          if (isAuthenticated && entry._id) {
            try {
              await entriesApi.deleteEntry(entry._id);
            } catch (error) {
              // Revert on error
              set((state) => {
                const newEntries = [...state.entries, entry].sort((a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                return {
                  entries: newEntries,
                  mainEntries: calculateMainEntries(newEntries),
                };
              });
            }
          }
        },

        updateEntry: async (id, updatedEntry) => {
          const state = get();
          const oldEntry = state.entries.find((e) => e.id === id);
          if (!oldEntry) return;

          const newEntry = { ...oldEntry, ...updatedEntry };

          // Optimistically update local store
          set((state) => {
            const newEntries = state.entries.map((e) => (e.id === id ? newEntry : e));
            const newMainEntries = calculateMainEntries(newEntries);
            return {
              entries: newEntries,
              mainEntries: newMainEntries,
            };
          });

          // Sync to database if authenticated
          const { isAuthenticated } = useAuthStore.getState();
          if (isAuthenticated && oldEntry._id) {
            try {
              const apiEntry = convertStoreEntryToApi(newEntry);
              const updated = await entriesApi.updateEntry(oldEntry._id, apiEntry);
              const updatedStoreEntry = convertApiEntryToStore(updated);

              set((state) => ({
                entries: state.entries.map((e) =>
                  e.id === id ? updatedStoreEntry : e
                ),
                mainEntries: calculateMainEntries(state.entries.map((e) =>
                  e.id === id ? updatedStoreEntry : e
                )),
              }));
            } catch (error) {
              // Revert on error
              set((state) => {
                const newEntries = state.entries.map((e) => (e.id === id ? oldEntry : e));
                return {
                  entries: newEntries,
                  mainEntries: calculateMainEntries(newEntries),
                };
              });
            }
          }
        },

        getEntries: () => get().entries,

        getEntriesByType: (type) =>
          get().entries.filter((entry) => entry.type === type),
      };
    },
    {
      name: 'entries-storage',
      partialize: (state) => ({
        entries: state.entries,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Recalculate mainEntries when rehydrating
          state.mainEntries = calculateMainEntries(state.entries);
        }
      },
    }
  )
);