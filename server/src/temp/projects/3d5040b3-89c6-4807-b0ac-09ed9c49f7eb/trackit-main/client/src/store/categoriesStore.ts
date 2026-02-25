import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { categoriesApi, Categories } from '../api/categories';
import { useAuthStore } from './authStore';

interface CategoriesStore {
  categories: Categories;
  isLoading: boolean;
  isSyncing: boolean;
  addCategory: (categoryType: keyof Categories, category: string) => Promise<void>;
  removeCategory: (categoryType: keyof Categories, category: string) => Promise<void>;
  updateCategories: (categories: Categories) => Promise<void>;
  loadCategoriesFromDatabase: () => Promise<void>;
}

const defaultCategories: Categories = {
  income: [
    'salary',
    'freelance',
    'business revenue',
    'interest earned',
    'dividends',
    'other',
    'bonus',
    'commission',
  ],
  expense: [
    'rent',
    'groceries',
    'dining out',
    'transportation',
    'entertainment',
    'healthcare',
    'utilities',
    'subscriptions',
    'miscellaneous',
    'insurance',
    'travel',
  ],
  investment: [
    'stocks',
    'mutual funds',
    'real estate',
    'cryptocurrency',
    'gold',
    'commodities',
    'other investments',
    'bonds',
    'ETFs',
  ],
  savings: [
    'emergency fund',
    'retirement fund',
    'fixed deposits',
    'high-interest savings',
    'travel savings',
    'college fund',
    'vacation fund',
  ],
};

export const useCategoriesStore = create<CategoriesStore>()(
  persist(
    (set, get) => ({
      categories: defaultCategories,
      isLoading: false,
      isSyncing: false,

      loadCategoriesFromDatabase: async () => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) return;

        try {
          set({ isLoading: true });
          const categories = await categoriesApi.getCategories();
          // Merge with default categories (defaults as fallback, user categories take precedence)
          const mergedCategories: Categories = {
            income: [...new Set([...defaultCategories.income, ...(categories.income || [])])],
            expense: [...new Set([...defaultCategories.expense, ...(categories.expense || [])])],
            investment: [...new Set([...defaultCategories.investment, ...(categories.investment || [])])],
            savings: [...new Set([...defaultCategories.savings, ...(categories.savings || [])])],
          };
          set({ categories: mergedCategories, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
        }
      },

      addCategory: async (categoryType: keyof Categories, category: string) => {
        const state = get();
        
        // Check if category already exists
        if (state.categories[categoryType].includes(category)) {
          return;
        }

        // Optimistically add to local store
        set((state) => ({
          categories: {
            ...state.categories,
            [categoryType]: [...state.categories[categoryType], category],
          },
        }));

        // Sync to database if authenticated
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          try {
            await categoriesApi.addCategory(categoryType, category);
          } catch (error) {
            // Revert on error
            set((state) => ({
              categories: {
                ...state.categories,
                [categoryType]: state.categories[categoryType].filter(
                  (c) => c !== category
                ),
              },
            }));
          }
        }
      },

      removeCategory: async (categoryType: keyof Categories, category: string) => {
        
        // Check if it's a default category (don't remove defaults, only user-added ones)
        if (defaultCategories[categoryType].includes(category)) {
          return;
        }

        // Optimistically remove from local store
        set((state) => ({
          categories: {
            ...state.categories,
            [categoryType]: state.categories[categoryType].filter(
              (c) => c !== category
            ),
          },
        }));

        // Sync to database if authenticated
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          try {
            await categoriesApi.removeCategory(categoryType, category);
          } catch (error) {
            // Revert on error
            set((state) => ({
              categories: {
                ...state.categories,
                [categoryType]: [...state.categories[categoryType], category],
              },
            }));
          }
        }
      },

      updateCategories: async (categories: Categories) => {
        // Optimistically update local store
        set({ categories });

        // Sync to database if authenticated
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          try {
            await categoriesApi.updateCategories(categories);
          } catch (error) {
            // Could revert here if needed
          }
        }
      },
    }),
    {
      name: 'categories-storage',
      partialize: (state) => ({
        categories: state.categories,
      }),
    }
  )
);
