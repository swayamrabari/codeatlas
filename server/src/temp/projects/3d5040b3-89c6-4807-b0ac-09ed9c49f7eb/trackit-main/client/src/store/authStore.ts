/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';
import { useEntriesStore } from './entriesStore';
import { useBudgetStore } from './budgetStore';
import { useCategoriesStore } from './categoriesStore';
import { useChatStore } from './chatStore';

// Helper function to load all user data from database
const loadAllUserData = async () => {
  try {
    // Fetch all data in one request
    const data = await authApi.getAllUserData();

    // Load entries
    const storeEntries = data.entries.map((apiEntry: any) => ({
      id: apiEntry._id || apiEntry.id || '',
      _id: apiEntry._id,
      type: apiEntry.type,
      category: apiEntry.category,
      amount: apiEntry.amount,
      date: typeof apiEntry.date === 'string' ? apiEntry.date : new Date(apiEntry.date).toISOString(),
      description: apiEntry.description,
    }));
    const mainEntries = storeEntries.reduce(
      (acc: Record<string, number>, entry: any) => {
        acc[entry.type] = (acc[entry.type] || 0) + entry.amount;
        return acc;
      },
      {} as Record<string, number>
    );
    useEntriesStore.setState({ entries: storeEntries, mainEntries });

    // Load budgets (calculate spent after entries are loaded)
    const calculateSpentAmount = (budget: any): number => {
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

    const storeBudgets = data.budgets.map((apiBudget: any) => {
      const budgetWithoutId = {
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
    });
    useBudgetStore.setState({ budgets: storeBudgets });

    // Load categories
    const defaultCategories = {
      income: ['salary', 'freelance', 'business revenue', 'interest earned', 'dividends', 'other', 'bonus', 'commission'],
      expense: ['rent', 'groceries', 'dining out', 'transportation', 'entertainment', 'healthcare', 'utilities', 'subscriptions', 'miscellaneous', 'insurance', 'travel'],
      investment: ['stocks', 'mutual funds', 'real estate', 'cryptocurrency', 'gold', 'commodities', 'other investments', 'bonds', 'ETFs'],
      savings: ['emergency fund', 'retirement fund', 'fixed deposits', 'high-interest savings', 'travel savings', 'college fund', 'vacation fund'],
    };
    const mergedCategories = {
      income: [...new Set([...defaultCategories.income, ...(data.categories?.income || [])])],
      expense: [...new Set([...defaultCategories.expense, ...(data.categories?.expense || [])])],
      investment: [...new Set([...defaultCategories.investment, ...(data.categories?.investment || [])])],
      savings: [...new Set([...defaultCategories.savings, ...(data.categories?.savings || [])])],
    };
    useCategoriesStore.setState({ categories: mergedCategories });

    // Load chats (use existing chat store method)
    useChatStore.getState().loadSessionsFromDatabase();
  } catch (error) {
    // Error handled silently - UI will show appropriate state
  }
};

interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;

  // Password reset (forgot password)
  requestPasswordResetOtp: (email: string) => Promise<void>;
  verifyPasswordResetOtp: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const { user, token } = await authApi.login(email, password);
          set({
            user: {
              _id: user.id,
              name: user.name,
              email: user.email,
              role: user.role || 'user',
            },
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Load all user data after successful login
          await loadAllUserData();
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          await authApi.register(name, email, password);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      verifyOtp: async (email: string, otp: string) => {
        try {
          set({ isLoading: true, error: null });
          const { user, token } = await authApi.verifyOtp(email, otp);
          set({
            user: {
              _id: user.id,
              name: user.name,
              email: user.email,
              role: user.role || 'user',
            },
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Load all user data after successful verification
          await loadAllUserData();
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'OTP verification failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore errors on logout
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuthStatus: async () => {
        try {
          set({ isLoading: true });
          const { user } = await authApi.getCurrentUser();
          set({
            user: {
              _id: user.id,
              name: user.name,
              email: user.email,
              role: user.role || 'user',
            },
            isAuthenticated: true,
            isLoading: false,
          });

          // Load all user data after successful authentication
          await loadAllUserData();
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),

      // Password reset (forgot password)
      requestPasswordResetOtp: async (email: string) => {
        try {
          set({ isLoading: true, error: null });
          await authApi.requestPasswordResetOtp(email);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Failed to send OTP',
            isLoading: false,
          });
          throw error;
        }
      },

      verifyPasswordResetOtp: async (email: string, otp: string) => {
        try {
          set({ isLoading: true, error: null });
          await authApi.verifyPasswordResetOtp(email, otp);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'OTP verification failed',
            isLoading: false,
          });
          throw error;
        }
      },

      resetPassword: async (email: string, newPassword: string) => {
        try {
          set({ isLoading: true, error: null });
          await authApi.resetPassword(email, newPassword);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Password reset failed',
            isLoading: false,
          });
          throw error;
        }
      },

    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user && state.token) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
