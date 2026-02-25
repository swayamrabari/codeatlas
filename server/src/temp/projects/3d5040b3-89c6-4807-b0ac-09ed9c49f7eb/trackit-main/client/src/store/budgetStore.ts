import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEntriesStore } from './entriesStore';
import { budgetsApi, Budget as ApiBudget } from '../api/budgets';
import { useAuthStore } from './authStore';

export interface Budget {
  id: string;
  _id?: string; // Database ID
  type: string;
  category: string;
  amount: number;
  period: string;
  spent: number;
}

interface BudgetStore {
  budgets: Budget[];
  isLoading: boolean;
  isSyncing: boolean;
  addBudget: (budget: Omit<Budget, 'id' | '_id' | 'spent'>) => Promise<void>;
  removeBudget: (id: string) => Promise<void>;
  updateBudget: (id: string, updatedBudget: Partial<Budget>) => Promise<void>;
  getBudgets: () => Budget[];
  getBudgetsByType: (type: Budget['type']) => Budget[];
  refreshBudgetSpending: () => void;
  loadBudgetsFromDatabase: () => Promise<void>;
}

// Helper function to calculate spent amount for a budget
const calculateSpentAmount = (budget: Omit<Budget, 'id' | '_id' | 'spent'>): number => {
  const entries = useEntriesStore.getState().getEntries();

  const relevantEntries = entries.filter(
    (entry) => entry.type === budget.type && entry.category === budget.category
  );

  const currentDate = new Date();
  const periodStart = new Date(currentDate);
  let periodEnd = new Date(currentDate);

  if (budget.period === 'monthly') {
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else if (budget.period === 'quarterly') {
    const currentMonth = currentDate.getMonth();
    const quarterStartMonth = currentMonth - (currentMonth % 3);
    periodStart.setMonth(quarterStartMonth, 1);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 3);
  } else if (budget.period === 'yearly') {
    periodStart.setMonth(0, 1);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else if (budget.period === 'half-yearly') {
    const currentMonth = currentDate.getMonth();
    const halfStartMonth = currentMonth < 6 ? 0 : 6;
    periodStart.setMonth(halfStartMonth, 1);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 6);
  }

  const entriesInPeriod = relevantEntries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= periodStart && entryDate < periodEnd;
  });

  return entriesInPeriod.reduce((total, entry) => total + entry.amount, 0);
};

// Helper to convert API budget to store budget
const convertApiBudgetToStore = (apiBudget: ApiBudget): Budget => {
  const budgetWithoutId: Omit<Budget, 'id' | '_id' | 'spent'> = {
    type: apiBudget.type,
    category: apiBudget.category,
    amount: apiBudget.amount,
    period: apiBudget.period,
  };
  return {
    id: apiBudget._id || apiBudget.id || '',
    _id: apiBudget._id,
    ...budgetWithoutId,
    spent: calculateSpentAmount(budgetWithoutId),
  };
};

// Helper to convert store budget to API format
const convertStoreBudgetToApi = (budget: Budget): Omit<ApiBudget, '_id' | 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    type: budget.type as ApiBudget['type'],
    category: budget.category,
    amount: budget.amount,
    period: budget.period as ApiBudget['period'],
  };
};

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => {
      // Subscribe to entries store changes to refresh spending
      useEntriesStore.subscribe(() => {
        // When entries change, refresh budget spending
        get().refreshBudgetSpending();
      });

      return {
        budgets: [],
        isLoading: false,
        isSyncing: false,

        loadBudgetsFromDatabase: async () => {
          const { isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated) return;

          try {
            set({ isLoading: true });
            const apiBudgets = await budgetsApi.getBudgets();
            const storeBudgets = apiBudgets.map(convertApiBudgetToStore);
            set({ budgets: storeBudgets, isLoading: false });
          } catch (error) {
            set({ isLoading: false });
          }
        },

        addBudget: async (budget) => {
          const { isAuthenticated } = useAuthStore.getState();
          const newBudget: Budget = {
            ...budget,
            id: crypto.randomUUID(),
            spent: calculateSpentAmount(budget),
          };

          // Optimistically add to local store
          set((state) => ({
            budgets: [...state.budgets, newBudget],
          }));

          // Sync to database if authenticated
          if (isAuthenticated) {
            try {
              const apiBudget = convertStoreBudgetToApi(newBudget);
              const created = await budgetsApi.createBudget(apiBudget);
              const createdStoreBudget = convertApiBudgetToStore(created);

              set((state) => ({
                budgets: state.budgets.map((b) =>
                  b.id === newBudget.id ? createdStoreBudget : b
                ),
              }));
            } catch (error: any) {
              // Revert on error
              set((state) => ({
                budgets: state.budgets.filter((b) => b.id !== newBudget.id),
              }));
              // Re-throw error so caller knows it failed
              const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create budget in database';
              throw new Error(`Budget creation failed: ${errorMessage}`);
            }
          }
        },

        removeBudget: async (id) => {
          const state = get();
          const budget = state.budgets.find((b) => b.id === id);
          if (!budget) return;

          const { isAuthenticated } = useAuthStore.getState();

          // Optimistically remove from local store
          set((state) => ({
            budgets: state.budgets.filter((b) => b.id !== id),
          }));

          // Delete from database if authenticated
          if (isAuthenticated && budget._id) {
            try {
              await budgetsApi.deleteBudget(budget._id);
            } catch (error) {
              // Revert on error
              set((state) => ({
                budgets: [...state.budgets, budget],
              }));
            }
          }
        },

        updateBudget: async (id, updatedBudget) => {
          const state = get();
          const oldBudget = state.budgets.find((b) => b.id === id);
          if (!oldBudget) return;

          const newBudget = {
            ...oldBudget,
            ...updatedBudget,
            spent: calculateSpentAmount({
              type: updatedBudget.type ?? oldBudget.type,
              category: updatedBudget.category ?? oldBudget.category,
              amount: updatedBudget.amount ?? oldBudget.amount,
              period: updatedBudget.period ?? oldBudget.period,
            }),
          };

          // Optimistically update local store
          set((state) => ({
            budgets: state.budgets.map((b) => (b.id === id ? newBudget : b)),
          }));

          // Sync to database if authenticated
          const { isAuthenticated } = useAuthStore.getState();
          if (isAuthenticated && oldBudget._id) {
            try {
              const apiBudget = convertStoreBudgetToApi(newBudget);
              const updated = await budgetsApi.updateBudget(oldBudget._id, apiBudget);
              const updatedStoreBudget = convertApiBudgetToStore(updated);

              set((state) => ({
                budgets: state.budgets.map((b) =>
                  b.id === id ? updatedStoreBudget : b
                ),
              }));
            } catch (error) {
              // Revert on error
              set((state) => ({
                budgets: state.budgets.map((b) => (b.id === id ? oldBudget : b)),
              }));
            }
          }
        },

        getBudgets: () => get().budgets,

        getBudgetsByType: (type) =>
          get().budgets.filter((budget) => budget.type === type),

        refreshBudgetSpending: () =>
          set((state) => ({
            budgets: state.budgets.map((budget) => ({
              ...budget,
              spent: calculateSpentAmount(budget),
            })),
          })),
      };
    },
    {
      name: 'budget-storage',
      partialize: (state) => ({
        budgets: state.budgets,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.budgets.length > 0) {
          // Calculate spent amounts for all budgets when loading from localStorage
          // Use requestAnimationFrame to ensure entries store is also hydrated
          requestAnimationFrame(() => {
            // Double check entries are available before calculating
            const entries = useEntriesStore.getState().getEntries();
            if (entries.length >= 0) {
              state.refreshBudgetSpending();
            }
          });
        }
      },
    }
  )
);

// Utility function to calculate progress for a specific budget
export function calculateBudgetProgress(budget: Budget): {
  currentSpending: number;
  progress: number;
  remaining: number;
} {
  // Get all entries from the entries store
  const entries = useEntriesStore.getState().getEntries();

  // Filter entries by type and category that match the budget
  const relevantEntries = entries.filter(
    (entry) => entry.type === budget.type && entry.category === budget.category
  );

  // Calculate current period based on today and budget.period
  const currentDate = new Date();
  const periodStart = new Date(currentDate);
  let periodEnd = new Date(currentDate);

  if (budget.period === 'monthly') {
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else if (budget.period === 'quarterly') {
    const currentMonth = currentDate.getMonth();
    const quarterStartMonth = currentMonth - (currentMonth % 3);
    periodStart.setMonth(quarterStartMonth, 1);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 3);
  } else if (budget.period === 'yearly') {
    periodStart.setMonth(0, 1);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else if (budget.period === 'half-yearly') {
    const currentMonth = currentDate.getMonth();
    const halfStartMonth = currentMonth < 6 ? 0 : 6;
    periodStart.setMonth(halfStartMonth, 1);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 6);
  }

  // Filter entries by date range
  const entriesInPeriod = relevantEntries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= periodStart && entryDate < periodEnd;
  });

  // Calculate total spending for the period
  const currentSpending = entriesInPeriod.reduce(
    (total, entry) => total + entry.amount,
    0
  );

  // Calculate progress percentage
  const progress = Math.min(
    Math.round((currentSpending / budget.amount) * 100),
    100
  );

  // Calculate remaining amount
  const remaining = Math.max(budget.amount - currentSpending, 0);

  return { currentSpending, progress, remaining };
}
