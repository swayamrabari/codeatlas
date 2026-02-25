/**
 * Function Executor for TrackIt Assistant
 * 
 * This module handles execution of functions on Zustand stores
 * based on function calls from the server-side assistant.
 * 
 * @example
 * ```typescript
 * // Execute a function to get all entries
 * const result = await executeFunction('getAllEntries', {});
 * 
 * // Execute a function with parameters
 * const result = await executeFunction('getEntriesByType', { type: 'expense' });
 * ```
 * 
 * @author TrackIt Team
 * @version 2.0.0
 */

import { useEntriesStore } from '@/store/entriesStore';
import { useBudgetStore, calculateBudgetProgress } from '@/store/budgetStore';
import { useCategoriesStore } from '@/store/categoriesStore';
import { useAuthStore } from '@/store/authStore';

export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  functionName?: string;
  executionTime?: number;
}

export interface FunctionError extends Error {
  functionName: string;
  parameters: Record<string, any>;
  timestamp: Date;
}

// Type definitions for function parameters
export interface EntryType {
  type: 'income' | 'expense' | 'investment' | 'savings';
}

export interface CategoryFilter extends EntryType {
  category: string;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense' | 'investment' | 'savings';
}

export interface TopCategoriesFilter extends EntryType {
  topN?: number;
  startDate?: string;
  endDate?: string;
}

export interface ComparePeriods extends EntryType {
  period1Start: string;
  period1End: string;
  period2Start: string;
  period2End: string;
}

export interface SpendingTrendsFilter extends EntryType {
  period: 'week' | 'month' | 'quarter' | 'year';
  limit?: number;
}

export interface BudgetFilter {
  type?: 'income' | 'expense' | 'investment' | 'savings';
  category?: string;
}

export interface CompareActualVsBudget extends EntryType {
  category?: string;
  month?: number;
  year?: number;
}

export interface AddEntryParams {
  type: 'income' | 'expense' | 'investment' | 'savings';
  category: string;
  amount: number;
  date: string;
  note?: string;
}

export interface SetBudgetParams {
  type: 'income' | 'expense' | 'investment' | 'savings';
  category: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
}

export interface AddCategoryParams {
  type: 'income' | 'expense' | 'investment' | 'savings';
  categoryName: string;
}

// Union type for all possible parameter types
export type FunctionParameters =
  | Record<string, never>
  | EntryType
  | CategoryFilter
  | DateRangeFilter
  | TopCategoriesFilter
  | ComparePeriods
  | SpendingTrendsFilter
  | BudgetFilter
  | CompareActualVsBudget
  | AddEntryParams
  | SetBudgetParams
  | AddCategoryParams;

// Type definitions for function results
export interface Entry {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
}

export interface Budget {
  id: string;
  type: string;
  category: string;
  amount: number;
  period: string;
}

export interface TopCategory {
  category: string;
  amount: number;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
}

export interface Categories {
  income: string[];
  expense: string[];
  investment: string[];
  savings: string[];
}

/**
 * Custom error class for function execution errors
 */
export class FunctionExecutionError extends Error implements FunctionError {
  public functionName: string;
  public parameters: Record<string, any>;
  public timestamp: Date;

  constructor(
    message: string,
    functionName: string,
    parameters: Record<string, any>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'FunctionExecutionError';
    this.functionName = functionName;
    this.parameters = parameters;
    this.timestamp = new Date();

    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Utility function to safely parse dates
 */
function safeParseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Filter entries by date range
 */
function filterEntriesByDateRange(entries: Entry[], startDate?: string, endDate?: string): Entry[] {
  if (!startDate && !endDate) return entries;

  return entries.filter(entry => {
    const entryDate = new Date(entry.date);
    if (startDate && endDate) {
      const start = safeParseDate(startDate);
      const end = safeParseDate(endDate);
      if (!start || !end) return false;
      return entryDate >= start && entryDate <= end;
    } else if (startDate) {
      const start = safeParseDate(startDate);
      if (!start) return false;
      return entryDate >= start;
    } else if (endDate) {
      const end = safeParseDate(endDate);
      if (!end) return false;
      return entryDate <= end;
    }
    return true;
  });
}

/**
 * Execute a function on the appropriate Zustand store
 */
export async function executeFunction(
  functionName: string,
  parameters: Record<string, any>
): Promise<FunctionResult> {
  const startTime = performance.now();

  try {
    let result: any;

    switch (functionName) {
      // ===== 1. TOTALS & SUMMARIES =====
      case 'getTotalSpending': {
        const params = parameters as DateRangeFilter;
        let entries = useEntriesStore.getState().getEntriesByType('expense');
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);
        result = entries.reduce((total, entry) => total + entry.amount, 0);
        break;
      }

      case 'getTotalIncome': {
        const params = parameters as DateRangeFilter;
        let entries = useEntriesStore.getState().getEntriesByType('income');
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);
        result = entries.reduce((total, entry) => total + entry.amount, 0);
        break;
      }

      case 'getTotalSavings': {
        const params = parameters as DateRangeFilter;
        let entries = useEntriesStore.getState().getEntriesByType('savings');
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);
        result = entries.reduce((total, entry) => total + entry.amount, 0);
        break;
      }

      case 'getTotalInvestments': {
        const params = parameters as DateRangeFilter;
        let entries = useEntriesStore.getState().getEntriesByType('investment');
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);
        result = entries.reduce((total, entry) => total + entry.amount, 0);
        break;
      }

      case 'getNetBalance': {
        const params = parameters as DateRangeFilter;
        const allEntries = useEntriesStore.getState().getEntries();
        const filteredEntries = filterEntriesByDateRange(allEntries, params.startDate, params.endDate);

        const income = filteredEntries
          .filter(e => e.type === 'income')
          .reduce((total, entry) => total + entry.amount, 0);
        const expenses = filteredEntries
          .filter(e => e.type === 'expense')
          .reduce((total, entry) => total + entry.amount, 0);
        const savings = filteredEntries
          .filter(e => e.type === 'savings')
          .reduce((total, entry) => total + entry.amount, 0);
        const investments = filteredEntries
          .filter(e => e.type === 'investment')
          .reduce((total, entry) => total + entry.amount, 0);

        result = income - expenses - savings - investments;
        break;
      }

      case 'getAverageSpending': {
        const params = parameters as DateRangeFilter;
        let entries = useEntriesStore.getState().getEntriesByType('expense');
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);

        if (entries.length === 0) {
          result = 0;
        } else {
          const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
          result = total / entries.length;
        }
        break;
      }

      case 'getMaxSpending': {
        const params = parameters as DateRangeFilter;
        let entries = useEntriesStore.getState().getEntriesByType('expense');
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);

        if (entries.length === 0) {
          result = { message: 'No spending transactions found' };
        } else {
          const maxEntry = entries.reduce((max, entry) =>
            entry.amount > max.amount ? entry : max
          );
          result = {
            amount: maxEntry.amount,
            category: maxEntry.category,
            date: maxEntry.date
          };
        }
        break;
      }

      case 'getMinSpending': {
        const params = parameters as DateRangeFilter;
        let entries = useEntriesStore.getState().getEntriesByType('expense');
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);

        if (entries.length === 0) {
          result = { message: 'No spending transactions found' };
        } else {
          const minEntry = entries.reduce((min, entry) =>
            entry.amount < min.amount ? entry : min
          );
          result = {
            amount: minEntry.amount,
            category: minEntry.category,
            date: minEntry.date
          };
        }
        break;
      }

      // ===== 2. COMPARISONS & TRENDS =====
      case 'comparePeriods': {
        const params = parameters as ComparePeriods;
        const allEntries = useEntriesStore.getState().getEntriesByType(params.type);

        const period1Entries = filterEntriesByDateRange(allEntries, params.period1Start, params.period1End);
        const period2Entries = filterEntriesByDateRange(allEntries, params.period2Start, params.period2End);

        const period1Total = period1Entries.reduce((sum, e) => sum + e.amount, 0);
        const period2Total = period2Entries.reduce((sum, e) => sum + e.amount, 0);

        const difference = period2Total - period1Total;
        const percentageChange = period1Total === 0 ? 0 : ((difference / period1Total) * 100);

        result = {
          period1: {
            startDate: params.period1Start,
            endDate: params.period1End,
            total: period1Total,
            count: period1Entries.length
          },
          period2: {
            startDate: params.period2Start,
            endDate: params.period2End,
            total: period2Total,
            count: period2Entries.length
          },
          difference: difference,
          percentageChange: percentageChange,
          trend: difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'unchanged'
        };
        break;
      }

      case 'getHighestSpendingMonth': {
        const params = parameters as { year?: number };
        let entries = useEntriesStore.getState().getEntriesByType('expense');

        if (params.year) {
          entries = entries.filter(e => new Date(e.date).getFullYear() === params.year);
        }

        const monthlyTotals: Record<string, { total: number; year: number; month: number }> = {};

        entries.forEach(entry => {
          const date = new Date(entry.date);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const key = `${year}-${month}`;

          if (!monthlyTotals[key]) {
            monthlyTotals[key] = { total: 0, year, month };
          }
          monthlyTotals[key].total += entry.amount;
        });

        if (Object.keys(monthlyTotals).length === 0) {
          result = { message: 'No spending data found' };
        } else {
          const highest = Object.values(monthlyTotals).reduce((max, current) =>
            current.total > max.total ? current : max
          );

          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

          result = {
            month: monthNames[highest.month - 1],
            year: highest.year,
            total: highest.total
          };
        }
        break;
      }

      case 'getLowestSpendingMonth': {
        const params = parameters as { year?: number };
        let entries = useEntriesStore.getState().getEntriesByType('expense');

        if (params.year) {
          entries = entries.filter(e => new Date(e.date).getFullYear() === params.year);
        }

        const monthlyTotals: Record<string, { total: number; year: number; month: number }> = {};

        entries.forEach(entry => {
          const date = new Date(entry.date);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const key = `${year}-${month}`;

          if (!monthlyTotals[key]) {
            monthlyTotals[key] = { total: 0, year, month };
          }
          monthlyTotals[key].total += entry.amount;
        });

        if (Object.keys(monthlyTotals).length === 0) {
          result = { message: 'No spending data found' };
        } else {
          const lowest = Object.values(monthlyTotals).reduce((min, current) =>
            current.total < min.total ? current : min
          );

          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

          result = {
            month: monthNames[lowest.month - 1],
            year: lowest.year,
            total: lowest.total
          };
        }
        break;
      }

      case 'getSpendingTrends': {
        const params = parameters as SpendingTrendsFilter;
        const entries = useEntriesStore.getState().getEntriesByType(params.type);
        const period = params.period;
        const limit = params.limit || 6;

        const currentDate = new Date();
        const trends: any[] = [];

        for (let i = limit - 1; i >= 0; i--) {
          let periodStart: Date;
          let periodEnd: Date;
          let periodLabel: string;

          if (period === 'week') {
            periodStart = new Date(currentDate);
            periodStart.setDate(currentDate.getDate() - (currentDate.getDay() + 7 * i));
            periodStart.setHours(0, 0, 0, 0);
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodStart.getDate() + 6);
            periodEnd.setHours(23, 59, 59, 999);
            periodLabel = `Week ${periodStart.getDate()}/${periodStart.getMonth() + 1}`;
          } else if (period === 'month') {
            periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
            periodEnd.setHours(23, 59, 59, 999);
            periodLabel = `${periodStart.toLocaleString('default', { month: 'short' })} ${periodStart.getFullYear()}`;
          } else if (period === 'quarter') {
            const quarterStartMonth = Math.floor((currentDate.getMonth() - i * 3) / 3) * 3;
            periodStart = new Date(currentDate.getFullYear(), quarterStartMonth, 1);
            periodEnd = new Date(currentDate.getFullYear(), quarterStartMonth + 3, 0);
            periodEnd.setHours(23, 59, 59, 999);
            periodLabel = `Q${Math.floor(quarterStartMonth / 3) + 1} ${periodStart.getFullYear()}`;
          } else if (period === 'year') {
            periodStart = new Date(currentDate.getFullYear() - i, 0, 1);
            periodEnd = new Date(currentDate.getFullYear() - i, 11, 31);
            periodEnd.setHours(23, 59, 59, 999);
            periodLabel = periodStart.getFullYear().toString();
          } else {
            throw new Error(`Invalid period: ${period}`);
          }

          const periodEntries = entries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= periodStart && entryDate <= periodEnd;
          });

          const total = periodEntries.reduce((sum, entry) => sum + entry.amount, 0);

          trends.push({
            period: periodLabel,
            amount: total,
            entryCount: periodEntries.length,
            startDate: periodStart.toISOString().split('T')[0],
            endDate: periodEnd.toISOString().split('T')[0]
          });
        }

        result = trends.reverse();
        break;
      }

      // ===== 3. TOP CATEGORIES & RANKINGS =====
      case 'getTopCategories': {
        const params = parameters as TopCategoriesFilter;
        let entries = useEntriesStore.getState().getEntriesByType(params.type);
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);

        const categoryTotals: Record<string, number> = {};

        if (!entries || entries.length === 0) {
          result = [];
          break;
        }

        entries.forEach(entry => {
          if (entry && entry.category && typeof entry.amount === 'number') {
            categoryTotals[entry.category] = (categoryTotals[entry.category] || 0) + entry.amount;
          }
        });

        const sortedCategories = Object.entries(categoryTotals)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, params.topN || 3);

        result = sortedCategories;
        break;
      }

      case 'getCategoryWithMaxSpending': {
        const params = parameters as DateRangeFilter;
        let entries = useEntriesStore.getState().getEntriesByType('expense');
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);

        if (entries.length === 0) {
          result = { message: 'No expense data found' };
          break;
        }

        const categoryTotals: Record<string, number> = {};
        entries.forEach(entry => {
          categoryTotals[entry.category] = (categoryTotals[entry.category] || 0) + entry.amount;
        });

        const maxCategory = Object.entries(categoryTotals).reduce((max, [cat, amount]) =>
          amount > max[1] ? [cat, amount] : max
        );

        result = {
          category: maxCategory[0],
          amount: maxCategory[1]
        };
        break;
      }

      case 'getCategoryWithMinSpending': {
        const params = parameters as DateRangeFilter;
        let entries = useEntriesStore.getState().getEntriesByType('expense');
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);

        if (entries.length === 0) {
          result = { message: 'No expense data found' };
          break;
        }

        const categoryTotals: Record<string, number> = {};
        entries.forEach(entry => {
          categoryTotals[entry.category] = (categoryTotals[entry.category] || 0) + entry.amount;
        });

        const minCategory = Object.entries(categoryTotals).reduce((min, [cat, amount]) =>
          amount < min[1] ? [cat, amount] : min
        );

        result = {
          category: minCategory[0],
          amount: minCategory[1]
        };
        break;
      }

      case 'getCategoryPercentageDistribution': {
        const params = parameters as TopCategoriesFilter;
        let entries = useEntriesStore.getState().getEntriesByType(params.type);
        entries = filterEntriesByDateRange(entries, params.startDate, params.endDate);

        if (entries.length === 0) {
          result = [];
          break;
        }

        const categoryTotals: Record<string, number> = {};
        let grandTotal = 0;

        entries.forEach(entry => {
          categoryTotals[entry.category] = (categoryTotals[entry.category] || 0) + entry.amount;
          grandTotal += entry.amount;
        });

        result = Object.entries(categoryTotals)
          .map(([category, amount]) => ({
            category,
            amount,
            percentage: grandTotal === 0 ? 0 : (amount / grandTotal) * 100
          }))
          .sort((a, b) => b.amount - a.amount);
        break;
      }

      // ===== 4. BUDGETS =====
      case 'getTotalBudget': {
        const params = parameters as BudgetFilter;
        let budgets = useBudgetStore.getState().getBudgets();

        if (params.type) {
          budgets = budgets.filter(b => b.type === params.type);
        }
        if (params.category) {
          budgets = budgets.filter(b => b.category === params.category);
        }

        result = budgets.reduce((total, budget) => total + budget.amount, 0);
        break;
      }

      case 'compareActualVsBudget': {
        const params = parameters as CompareActualVsBudget;
        let budgets = useBudgetStore.getState().getBudgetsByType(params.type);

        if (params.category) {
          budgets = budgets.filter(b => b.category.toLowerCase() === (params.category as string).toLowerCase());
        }

        if (budgets.length === 0) {
          result = {
            message: `No budgets found for ${params.category ? `category "${params.category}"` : params.type}`,
            budgets: []
          };
          break;
        }

        // If multiple budgets exist (same category but different periods), return all of them
        if (budgets.length > 1 && params.category) {
          result = {
            message: `Multiple budgets found for "${params.category}" with different periods. Showing all:`,
            budgets: budgets.map(budget => {
              const progress = calculateBudgetProgress(budget);
              return {
                category: budget.category,
                period: budget.period,
                budgeted: budget.amount,
                actual: progress.currentSpending,
                remaining: progress.remaining,
                difference: progress.currentSpending - budget.amount,
                complianceStatus: progress.progress > 100 ? 'over budget' : progress.progress >= 80 ? 'critical' : 'within budget',
                percentage: progress.progress
              };
            })
          };
          break;
        }

        // Single budget case - use progress calculation for accurate period-based comparison
        const budget = budgets[0];
        const progress = calculateBudgetProgress(budget);

        result = {
          category: budget.category,
          period: budget.period,
          budgeted: budget.amount,
          actual: progress.currentSpending,
          remaining: progress.remaining,
          difference: progress.currentSpending - budget.amount,
          complianceStatus: progress.progress > 100 ? 'over budget' : progress.progress >= 80 ? 'critical' : 'within budget',
          percentage: progress.progress
        };
        break;
      }

      case 'getBudgetCompliance': {
        const params = parameters as BudgetFilter;

        let budgets = useBudgetStore.getState().getBudgetsByType(params.type!);
        if (params.category) {
          budgets = budgets.filter(b => b.category === params.category);
        }

        const compliance = budgets.map(budget => {
          const progress = calculateBudgetProgress(budget);
          return {
            category: budget.category,
            budgetAmount: budget.amount,
            spent: progress.currentSpending,
            status: progress.progress > 100 ? 'over budget' : 'under budget',
            percentage: progress.progress
          };
        });

        result = compliance;
        break;
      }

      case 'getBudgetUsagePercentage': {
        const params = parameters as BudgetFilter;

        let budgets = useBudgetStore.getState().getBudgetsByType(params.type!);
        if (params.category) {
          budgets = budgets.filter(b => b.category === params.category);
        }

        if (budgets.length === 0) {
          result = 0;
          break;
        }

        const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
        const totalSpent = budgets.reduce((sum, b) => {
          const progress = calculateBudgetProgress(b);
          return sum + progress.currentSpending;
        }, 0);

        result = totalBudget === 0 ? 0 : (totalSpent / totalBudget) * 100;
        break;
      }

      case 'getTopOverBudgetCategories': {
        const params = parameters as TopCategoriesFilter;
        const budgets = useBudgetStore.getState().getBudgetsByType(params.type);

        const overBudget = budgets
          .map(budget => {
            const progress = calculateBudgetProgress(budget);
            return {
              category: budget.category,
              budgetAmount: budget.amount,
              spent: progress.currentSpending,
              overAmount: progress.currentSpending - budget.amount,
              percentage: progress.progress
            };
          })
          .filter(item => item.overAmount > 0)
          .sort((a, b) => b.overAmount - a.overAmount)
          .slice(0, params.topN || 3);

        result = overBudget;
        break;
      }

      case 'getTopUnderBudgetCategories': {
        const params = parameters as TopCategoriesFilter;
        const budgets = useBudgetStore.getState().getBudgetsByType(params.type);

        const underBudget = budgets
          .map(budget => {
            const progress = calculateBudgetProgress(budget);
            return {
              category: budget.category,
              budgetAmount: budget.amount,
              spent: progress.currentSpending,
              remaining: budget.amount - progress.currentSpending,
              percentage: progress.progress
            };
          })
          .filter(item => item.remaining > 0)
          .sort((a, b) => b.remaining - a.remaining)
          .slice(0, params.topN || 3);

        result = underBudget;
        break;
      }

      case 'getAllBudgets': {
        const params = parameters as BudgetFilter;
        let budgets = useBudgetStore.getState().getBudgets();

        if (params.type) {
          budgets = budgets.filter(b => b.type === params.type);
        }
        if (params.category) {
          budgets = budgets.filter(b => b.category.toLowerCase() === (params.category as string).toLowerCase());
        }

        result = budgets.map(budget => {
          const progress = calculateBudgetProgress(budget);
          return {
            id: budget.id,
            type: budget.type,
            category: budget.category,
            amount: budget.amount,
            period: budget.period,
            spent: progress.currentSpending,
            remaining: progress.remaining,
            progressPercentage: progress.progress,
            status: progress.progress > 100 ? 'over budget' : progress.progress >= 80 ? 'critical' : 'on track'
          };
        });
        break;
      }

      case 'getBudgetRemaining': {
        const params = parameters as BudgetFilter;
        let budgets = useBudgetStore.getState().getBudgetsByType(params.type!);

        if (params.category) {
          budgets = budgets.filter(b => b.category.toLowerCase() === (params.category as string).toLowerCase());
        }

        if (budgets.length === 0) {
          result = { message: `No budgets found for ${params.category ? `category "${params.category}"` : 'this type'}` };
          break;
        }

        result = budgets.map(budget => {
          const progress = calculateBudgetProgress(budget);
          return {
            category: budget.category,
            period: budget.period,
            budgetAmount: budget.amount,
            spent: progress.currentSpending,
            remaining: progress.remaining,
            progressPercentage: progress.progress,
            status: progress.progress > 100 ? 'over budget' : 'within budget'
          };
        });
        break;
      }

      case 'getBudgetStatus': {
        const params = parameters as BudgetFilter;
        let budgets = useBudgetStore.getState().getBudgetsByType(params.type!);

        if (params.category) {
          budgets = budgets.filter(b => b.category.toLowerCase() === (params.category as string).toLowerCase());
        }

        const currentDate = new Date();

        result = budgets.map(budget => {
          const progress = calculateBudgetProgress(budget);

          // Calculate days remaining in period
          let periodEnd: Date;
          const periodStart = new Date(currentDate);

          if (budget.period === 'monthly') {
            periodStart.setDate(1);
            periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          } else if (budget.period === 'quarterly') {
            const currentMonth = currentDate.getMonth();
            const quarterStartMonth = currentMonth - (currentMonth % 3);
            periodStart.setMonth(quarterStartMonth, 1);
            periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 3);
          } else if (budget.period === 'yearly') {
            periodStart.setMonth(0, 1);
            periodEnd = new Date(periodStart);
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else if (budget.period === 'half-yearly') {
            const currentMonth = currentDate.getMonth();
            const halfStartMonth = currentMonth < 6 ? 0 : 6;
            periodStart.setMonth(halfStartMonth, 1);
            periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 6);
          } else {
            periodEnd = new Date();
          }

          const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));

          return {
            category: budget.category,
            period: budget.period,
            budgetAmount: budget.amount,
            spent: progress.currentSpending,
            remaining: progress.remaining,
            progressPercentage: progress.progress,
            status: progress.progress > 100 ? 'over budget' : progress.progress >= 80 ? 'critical' : 'on track',
            daysRemaining: daysRemaining
          };
        });
        break;
      }

      case 'getBudgetAlignmentSummary': {
        const params = parameters as { type?: 'income' | 'expense' | 'investment' | 'savings' };
        let budgets = useBudgetStore.getState().getBudgets();

        if (params.type) {
          budgets = budgets.filter(b => b.type === params.type);
        }

        if (budgets.length === 0) {
          result = {
            totalBudgets: 0,
            message: 'No budgets found'
          };
          break;
        }

        let totalBudgeted = 0;
        let totalSpent = 0;
        const criticalBudgets: any[] = [];
        const budgetBreakdown: Record<string, any> = {};

        budgets.forEach(budget => {
          const progress = calculateBudgetProgress(budget);
          totalBudgeted += budget.amount;
          totalSpent += progress.currentSpending;

          const budgetInfo = {
            category: budget.category,
            period: budget.period,
            budgetAmount: budget.amount,
            spent: progress.currentSpending,
            remaining: progress.remaining,
            progressPercentage: progress.progress,
            status: progress.progress > 100 ? 'over budget' : progress.progress >= 80 ? 'critical' : 'on track'
          };

          if (progress.progress > 100 || progress.progress >= 80) {
            criticalBudgets.push(budgetInfo);
          }

          const key = budget.category;
          if (!budgetBreakdown[key]) {
            budgetBreakdown[key] = [];
          }
          budgetBreakdown[key].push(budgetInfo);
        });

        const overallProgress = totalBudgeted === 0 ? 0 : (totalSpent / totalBudgeted) * 100;
        const overallCompliance = overallProgress > 100 ? 'over budget' : overallProgress >= 80 ? 'critical' : 'within budget';

        // Sort critical budgets by progress percentage (highest first)
        criticalBudgets.sort((a, b) => b.progressPercentage - a.progressPercentage);

        result = {
          totalBudgets: budgets.length,
          totalBudgeted,
          totalSpent,
          totalRemaining: totalBudgeted - totalSpent,
          overallProgressPercentage: overallProgress,
          overallCompliance,
          criticalBudgetsCount: criticalBudgets.length,
          criticalBudgets,
          budgetBreakdown
        };
        break;
      }

      // ===== 5. ACTIONS (SAFE) =====
      case 'addEntry': {
        const params = parameters as AddEntryParams;

        // Validate parameters
        if (!params.type || !params.category || !params.amount || !params.date) {
          throw new FunctionExecutionError(
            'Missing required parameters for addEntry',
            functionName,
            parameters
          );
        }

        // Validate category exists in categories store
        const categories = useCategoriesStore.getState().categories;
        const categoryType = params.type as keyof typeof categories;
        const categoryExists = categories[categoryType]?.includes(params.category.toLowerCase());

        if (!categoryExists) {
          result = {
            success: false,
            message: `The category "${params.category}" does not exist for ${params.type}. Please add the category first using the addCategory function, or choose from existing categories: ${categories[categoryType]?.join(', ')}.`
          };
          break;
        }

        // Add entry to store (await the async operation)
        const newEntry = {
          type: params.type,
          category: params.category,
          amount: params.amount,
          date: params.date,
          description: params.note || ''
        };

        try {
          await useEntriesStore.getState().addEntry(newEntry);

          result = {
            success: true,
            message: `Successfully added ${params.type} entry of ${params.amount} for ${params.category} on ${params.date}`,
            data: {
              type: params.type,
              category: params.category,
              amount: params.amount,
              date: params.date,
              note: params.note
            }
          };
        } catch (error: any) {
          // Handle errors from entry creation
          const errorMessage = error?.message || 'Failed to create entry';
          result = {
            success: false,
            message: errorMessage,
            error: errorMessage
          };
        }
        break;
      }

      case 'setBudget': {
        const params = parameters as SetBudgetParams;

        // Validate parameters
        if (!params.type || !params.category || !params.amount || !params.period) {
          throw new FunctionExecutionError(
            'Missing required parameters for setBudget',
            functionName,
            parameters
          );
        }

        // Validate period
        const validPeriods = ['monthly', 'quarterly', 'half-yearly', 'yearly'];
        if (!validPeriods.includes(params.period)) {
          throw new FunctionExecutionError(
            `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
            functionName,
            parameters
          );
        }

        // Validate category exists in categories store
        const categories = useCategoriesStore.getState().categories;
        const categoryType = params.type as keyof typeof categories;
        const categoryExists = categories[categoryType]?.includes(params.category.toLowerCase());

        if (!categoryExists) {
          result = {
            success: false,
            message: `The category "${params.category}" does not exist for ${params.type}. Please add the category first using the addCategory function, or choose from existing categories: ${categories[categoryType]?.join(', ')}.`
          };
          break;
        }

        // Add/update budget in store (await the async operation)
        const newBudget = {
          id: Date.now().toString(),
          type: params.type,
          category: params.category,
          amount: params.amount,
          period: params.period,
          spent: 0
        };

        try {
          await useBudgetStore.getState().addBudget(newBudget);

          // Verify budget was actually added by checking the store
          const budgets = useBudgetStore.getState().getBudgets();
          const createdBudget = budgets.find(b =>
            b.type === params.type &&
            b.category === params.category &&
            b.period === params.period &&
            b.amount === params.amount
          );

          if (!createdBudget) {
            result = {
              success: false,
              message: 'Budget creation may have failed. Please check if the budget was created.',
              error: 'Budget not found in store after creation'
            };
          } else {
            result = {
              success: true,
              message: `Successfully set ${params.period} budget of ${params.amount} for ${params.category} (${params.type})`,
              data: {
                type: params.type,
                category: params.category,
                amount: params.amount,
                period: params.period
              }
            };
          }
        } catch (error: any) {
          // Handle errors from budget creation (e.g., duplicate budgets, network errors)
          const errorMessage = error?.message || 'Failed to create budget';
          result = {
            success: false,
            message: errorMessage,
            error: errorMessage
          };
        }
        break;
      }

      case 'addCategory': {
        const params = parameters as AddCategoryParams;

        // Validate parameters
        if (!params.type || !params.categoryName) {
          throw new FunctionExecutionError(
            'Missing required parameters for addCategory',
            functionName,
            parameters
          );
        }

        // Add category to store
        useCategoriesStore.getState().addCategory(params.type, params.categoryName);

        result = {
          success: true,
          message: `Successfully added category "${params.categoryName}" to ${params.type}`,
          category: {
            type: params.type,
            name: params.categoryName
          }
        };
        break;
      }

      // ===== 6. UTILITY FUNCTIONS =====
      case 'getUserInfo': {
        const user = useAuthStore.getState().user;
        result = user ? {
          id: user._id,
          name: user.name,
          email: user.email
        } : null;
        break;
      }

      case 'getAllCategories': {
        result = useCategoriesStore.getState().categories;
        break;
      }

      case 'getCategoriesByType': {
        const params = parameters as EntryType;
        const categoriesStore = useCategoriesStore.getState();
        const typeKey = params.type as keyof typeof categoriesStore.categories;
        result = categoriesStore.categories[typeKey];
        break;
      }

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }

    const executionTime = performance.now() - startTime;

    return {
      success: true,
      data: result,
      functionName,
      executionTime
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;

    const errorMessage = error instanceof FunctionExecutionError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Unknown error occurred';

    return {
      success: false,
      error: errorMessage,
      functionName,
      executionTime
    };
  }
}

/**
 * Get available function names
 */
export function getAvailableFunctions(): string[] {
  return [
    // Totals & Summaries
    'getTotalSpending',
    'getTotalIncome',
    'getTotalSavings',
    'getTotalInvestments',
    'getNetBalance',
    'getAverageSpending',
    'getMaxSpending',
    'getMinSpending',

    // Comparisons & Trends
    'comparePeriods',
    'getHighestSpendingMonth',
    'getLowestSpendingMonth',
    'getSpendingTrends',

    // Top Categories & Rankings
    'getTopCategories',
    'getCategoryWithMaxSpending',
    'getCategoryWithMinSpending',
    'getCategoryPercentageDistribution',

    // Budgets
    'getTotalBudget',
    'compareActualVsBudget',
    'getBudgetCompliance',
    'getBudgetUsagePercentage',
    'getTopOverBudgetCategories',
    'getTopUnderBudgetCategories',
    'getAllBudgets',
    'getBudgetRemaining',
    'getBudgetStatus',
    'getBudgetAlignmentSummary',

    // Actions
    'addEntry',
    'setBudget',
    'addCategory',

    // Utilities
    'getUserInfo',
    'getAllCategories',
    'getCategoriesByType'
  ];
}

/**
 * Check if a function exists
 */
export function functionExists(functionName: string): boolean {
  return getAvailableFunctions().includes(functionName);
}

/**
 * Get function metadata
 */
export function getFunctionMetadata(functionName: string): {
  name: string;
  store: string;
  description: string;
} | null {
  const storeMapping: Record<string, string> = {
    'getTotalSpending': 'entries',
    'getTotalIncome': 'entries',
    'getTotalSavings': 'entries',
    'getTotalInvestments': 'entries',
    'getNetBalance': 'entries',
    'getAverageSpending': 'entries',
    'getMaxSpending': 'entries',
    'getMinSpending': 'entries',
    'comparePeriods': 'entries',
    'getHighestSpendingMonth': 'entries',
    'getLowestSpendingMonth': 'entries',
    'getSpendingTrends': 'entries',
    'getTopCategories': 'entries',
    'getCategoryWithMaxSpending': 'entries',
    'getCategoryWithMinSpending': 'entries',
    'getCategoryPercentageDistribution': 'entries',
    'getTotalBudget': 'budget',
    'compareActualVsBudget': 'budget',
    'getBudgetCompliance': 'budget',
    'getBudgetUsagePercentage': 'budget',
    'getTopOverBudgetCategories': 'budget',
    'getTopUnderBudgetCategories': 'budget',
    'getAllBudgets': 'budget',
    'getBudgetRemaining': 'budget',
    'getBudgetStatus': 'budget',
    'getBudgetAlignmentSummary': 'budget',
    'addEntry': 'entries',
    'setBudget': 'budget',
    'addCategory': 'categories',
    'getUserInfo': 'auth',
    'getAllCategories': 'categories',
    'getCategoriesByType': 'categories'
  };

  if (!functionExists(functionName)) {
    return null;
  }

  return {
    name: functionName,
    store: storeMapping[functionName] || 'unknown',
    description: `Execute ${functionName} on the ${storeMapping[functionName] || 'unknown'} store`
  };
}
