const FUNCTION_CATALOG = [
  // ===== 1. TOTALS & SUMMARIES =====
  {
    name: 'getTotalSpending',
    description: 'Get total expenses. Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Total spending amount (number)',
  },
  {
    name: 'getTotalIncome',
    description: 'Get total income. Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Total income amount (number)',
  },
  {
    name: 'getTotalSavings',
    description: 'Get total savings. Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Total savings amount (number)',
  },
  {
    name: 'getTotalInvestments',
    description: 'Get total investments. Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Total investment amount (number)',
  },
  {
    name: 'getNetBalance',
    description: 'Get net balance (income - expenses - savings - investments). Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Net balance (number)',
  },
  {
    name: 'getAverageSpending',
    description: 'Get average spending per transaction. Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Average spending amount (number)',
  },
  {
    name: 'getMaxSpending',
    description: 'Find highest spending transaction. Returns amount, category, date. Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Maximum spending transaction details (amount, category, date)',
  },
  {
    name: 'getMinSpending',
    description: 'Find lowest spending transaction. Returns amount, category, date. Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Minimum spending transaction details (amount, category, date)',
  },

  // ===== 2. COMPARISONS & TRENDS =====
  {
    name: 'comparePeriods',
    description: 'Compare totals between two time periods. Requires type, period1Start, period1End, period2Start, period2End.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        period1Start: {
          type: 'string',
          format: 'date',
        },
        period1End: {
          type: 'string',
          format: 'date',
        },
        period2Start: {
          type: 'string',
          format: 'date',
        },
        period2End: {
          type: 'string',
          format: 'date',
        },
      },
      required: ['type', 'period1Start', 'period1End', 'period2Start', 'period2End'],
    },
    store: 'entries',
    returns: 'Comparison results with totals for both periods, difference, and percentage change',
  },
  {
    name: 'getHighestSpendingMonth',
    description: 'Find month with highest spending. Optional year.',
    parameters: {
      type: 'object',
      properties: {
        year: {
          type: 'number',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Month with highest spending (month name, year, and total amount)',
  },
  {
    name: 'getLowestSpendingMonth',
    description: 'Find month with lowest spending. Optional year.',
    parameters: {
      type: 'object',
      properties: {
        year: {
          type: 'number',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Month with lowest spending (month name, year, and total amount)',
  },
  {
    name: 'getSpendingTrends',
    description: 'Get trends over time. Requires type and period (week/month/quarter/year). Optional limit (default: 6).',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        period: {
          type: 'string',
          enum: ['week', 'month', 'quarter', 'year'],
        },
        limit: {
          type: 'number',
        },
      },
      required: ['type', 'period'],
    },
    store: 'entries',
    returns: 'Array of trend data with amounts and dates for each period',
  },

  // ===== 3. TOP CATEGORIES & RANKINGS =====
  {
    name: 'getTopCategories',
    description: 'Get top N categories by amount. Requires type. Optional topN (default: 3), date range.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        topN: {
          type: 'number',
        },
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: ['type'],
    },
    store: 'entries',
    returns: 'Array of top categories with names and total amounts',
  },
  {
    name: 'getCategoryWithMaxSpending',
    description: 'Find expense category with highest total. Returns category name and amount. Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Category name and total amount',
  },
  {
    name: 'getCategoryWithMinSpending',
    description: 'Find expense category with lowest total. Returns category name and amount. Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    store: 'entries',
    returns: 'Category name and total amount',
  },
  {
    name: 'getCategoryPercentageDistribution',
    description: 'Get percentage distribution across categories. Requires type. Optional date range.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        startDate: {
          type: 'string',
          format: 'date',
          description: 'Start date (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          format: 'date',
          description: 'End date (YYYY-MM-DD)',
        },
      },
      required: ['type'],
    },
    store: 'entries',
    returns: 'Array of categories with amounts and percentage of total',
  },

  // ===== 4. BUDGETS =====
  {
    name: 'getTotalBudget',
    description: 'Get total budget amount. Optional type and/or category.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        category: {
          type: 'string',
        },
      },
      required: [],
    },
    store: 'budget',
    returns: 'Total budget amount (number)',
  },
  {
    name: 'compareActualVsBudget',
    description: 'Compare actual vs budget. Requires type. Optional category, month, year.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        category: {
          type: 'string',
        },
        month: {
          type: 'number',
        },
        year: {
          type: 'number',
        },
      },
      required: ['type'],
    },
    store: 'budget',
    returns: 'Comparison with budgeted amount, actual amount, difference, and compliance status',
  },
  {
    name: 'getBudgetCompliance',
    description: 'Check over/under budget status. Requires type. Optional category.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        category: {
          type: 'string',
        },
      },
      required: ['type'],
    },
    store: 'budget',
    returns: 'Compliance status (over/under budget) with details',
  },
  {
    name: 'getBudgetUsagePercentage',
    description: 'Get percentage of budget used. Requires type. Optional category.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        category: {
          type: 'string',
        },
      },
      required: ['type'],
    },
    store: 'budget',
    returns: 'Percentage of budget used (number)',
  },
  {
    name: 'getTopOverBudgetCategories',
    description: 'Get top N over-budget categories. Requires type. Optional topN (default: 3).',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
          description: 'The type to check',
        },
        topN: {
          type: 'number',
          description: 'Number of categories to return (default: 3)',
        },
      },
      required: ['type'],
    },
    store: 'budget',
    returns: 'Array of over-budget categories with amounts and percentages',
  },
  {
    name: 'getTopUnderBudgetCategories',
    description: 'Get top N under-budget categories. Requires type. Optional topN (default: 3).',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
          description: 'The type to check',
        },
        topN: {
          type: 'number',
          description: 'Number of categories to return (default: 3)',
        },
      },
      required: ['type'],
    },
    store: 'budget',
    returns: 'Array of under-budget categories with amounts and percentages',
  },
  {
    name: 'getAllBudgets',
    description: 'Get all budgets with period, amount, spent, remaining. Use for "list budgets" or when multiple budgets exist. Optional type, category.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        category: {
          type: 'string',
        },
      },
      required: [],
    },
    store: 'budget',
    returns: 'Array of all budgets with id, type, category, amount, period, spent, remaining, and progress percentage',
  },
  {
    name: 'getBudgetRemaining',
    description: 'Get remaining budget (spent, remaining, details). Use for "budget left" questions. Requires type. Optional category. Returns all periods if multiple exist.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        category: {
          type: 'string',
        },
      },
      required: ['type'],
    },
    store: 'budget',
    returns: 'Array of budget objects with category, period, budgetAmount, spent, remaining, progress percentage, and status',
  },
  {
    name: 'getBudgetStatus',
    description: 'Get detailed budget status (spent, remaining, compliance, days remaining). Requires type. Optional category.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        category: {
          type: 'string',
        },
      },
      required: ['type'],
    },
    store: 'budget',
    returns: 'Array of budget status objects with category, period, budgetAmount, spent, remaining, progress percentage, status (over/under/on budget), and days remaining',
  },
  {
    name: 'getBudgetAlignmentSummary',
    description: 'Get overall budget alignment summary. Identifies critical budgets (>80% used or over). Use for "aligning with budgets" questions. Optional type.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
      },
      required: [],
    },
    store: 'budget',
    returns: 'Summary object with totalBudgets, totalSpent, totalBudgeted, overallCompliance, criticalBudgets (over budget or >80% used), and budgetBreakdown by category',
  },

  // ===== 5. ACTIONS =====
  {
    name: 'addEntry',
    description: 'Add financial transaction. Requires type, category (must exist), amount, date (YYYY-MM-DD). Optional note. DO NOT ask for start/end dates - only a single date is needed.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        category: {
          type: 'string',
        },
        amount: {
          type: 'number',
        },
        date: {
          type: 'string',
          format: 'date',
          description: 'Transaction date in YYYY-MM-DD format (single date, not a range)',
        },
        note: {
          type: 'string',
        },
      },
      required: ['type', 'category', 'amount', 'date'],
    },
    store: 'actions',
    returns: 'Success confirmation with entry details',
  },
  {
    name: 'setBudget',
    description: 'Add or update budget. Requires type, category (must exist), amount, period (monthly/quarterly/half-yearly/yearly). IMPORTANT: Budgets do NOT use start/end dates - only period is needed. DO NOT ask for dates.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        category: {
          type: 'string',
        },
        amount: {
          type: 'number',
        },
        period: {
          type: 'string',
          enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
          description: 'Budget period - monthly, quarterly, half-yearly, or yearly. NO dates needed.',
        },
      },
      required: ['type', 'category', 'amount', 'period'],
    },
    store: 'actions',
    returns: 'Success confirmation with budget details',
  },
  {
    name: 'addCategory',
    description: 'Add new category. Requires type, categoryName.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
        categoryName: {
          type: 'string',
        },
      },
      required: ['type', 'categoryName'],
    },
    store: 'actions',
    returns: 'Success confirmation with new category name',
  },

  // ===== 6. UTILITY FUNCTIONS =====
  {
    name: 'getUserInfo',
    description: 'Get current user info',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    store: 'auth',
    returns: 'Current user information',
  },
  {
    name: 'getAllCategories',
    description: 'Get all categories organized by type',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    store: 'categories',
    returns: 'Object containing all categories organized by type',
  },
  {
    name: 'getCategoriesByType',
    description: 'Get categories for specific type. Requires type.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['income', 'expense', 'investment', 'savings'],
        },
      },
      required: ['type'],
    },
    store: 'categories',
    returns: 'Array of categories for the specified type',
  },
];

/**
 * Validate function parameters against the function catalog schema
 * @param {string} functionName - The name of the function to validate
 * @param {object} parameters - The parameters to validate
 * @returns {object} - Validation result with isValid boolean and errors array
 */
function validateFunctionParameters(functionName, parameters) {
  const functionDef = FUNCTION_CATALOG.find(func => func.name === functionName);
  
  if (!functionDef) {
    return {
      isValid: false,
      errors: [`Function '${functionName}' not found in catalog`]
    };
  }

  const errors = [];
  const { properties, required } = functionDef.parameters;

  // Check required parameters
  if (required && required.length > 0) {
    for (const requiredParam of required) {
      if (!(requiredParam in parameters)) {
        errors.push(`Required parameter '${requiredParam}' is missing`);
      }
    }
  }

  // Validate parameter types and values
  for (const [paramName, paramValue] of Object.entries(parameters)) {
    const paramDef = properties[paramName];
    
    if (!paramDef) {
      errors.push(`Unknown parameter '${paramName}' for function '${functionName}'`);
      continue;
    }

    // Type validation
    if (paramDef.type === 'string' && typeof paramValue !== 'string') {
      errors.push(`Parameter '${paramName}' must be a string`);
    } else if (paramDef.type === 'number' && typeof paramValue !== 'number') {
      errors.push(`Parameter '${paramName}' must be a number`);
    } else if (paramDef.type === 'boolean' && typeof paramValue !== 'boolean') {
      errors.push(`Parameter '${paramName}' must be a boolean`);
    }

    // Enum validation
    if (paramDef.enum && !paramDef.enum.includes(paramValue)) {
      errors.push(`Parameter '${paramName}' must be one of: ${paramDef.enum.join(', ')}`);
    }

    // Date format validation
    if (paramDef.format === 'date') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(paramValue)) {
        errors.push(`Parameter '${paramName}' must be in YYYY-MM-DD format`);
      }
    }

    // Range validation for numbers
    if (paramDef.type === 'number') {
      if (paramDef.minimum !== undefined && paramValue < paramDef.minimum) {
        errors.push(`Parameter '${paramName}' must be at least ${paramDef.minimum}`);
      }
      if (paramDef.maximum !== undefined && paramValue > paramDef.maximum) {
        errors.push(`Parameter '${paramName}' must be at most ${paramDef.maximum}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get function definition by name
 * @param {string} functionName - The name of the function
 * @returns {object|null} - Function definition or null if not found
 */
function getFunctionDefinition(functionName) {
  return FUNCTION_CATALOG.find(func => func.name === functionName) || null;
}

/**
 * Get all available function names
 * @returns {string[]} - Array of function names
 */
function getAvailableFunctionNames() {
  return FUNCTION_CATALOG.map(func => func.name);
}

/**
 * Get functions by store
 * @param {string} storeName - The name of the store
 * @returns {object[]} - Array of functions for the specified store
 */
function getFunctionsByStore(storeName) {
  return FUNCTION_CATALOG.filter(func => func.store === storeName);
}

/**
 * Detect relevant stores based on user prompt keywords
 * @param {string} prompt - User's prompt
 * @returns {string[]} - Array of relevant store names
 */
function detectRelevantStores(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return ['entries', 'budget', 'categories', 'auth']; // Default: all
  }

  const promptLower = prompt.toLowerCase();
  const stores = new Set();
  
  // Entries keywords (spending, income, transactions, etc.)
  const entriesKeywords = [
    'spending', 'expense', 'expenses', 'income', 'savings', 'investment', 'investments',
    'transaction', 'transactions', 'entry', 'entries', 'spent', 'earned', 'earn',
    'net', 'balance', 'total', 'average', 'max', 'min', 'maximum', 'minimum',
    'trend', 'trends', 'compare', 'comparison', 'category', 'categories',
    'top', 'highest', 'lowest', 'how much', 'how many', 'what', 'show me',
    'monthly', 'weekly', 'yearly', 'period', 'range', 'date'
  ];
  
  // Budget keywords
  const budgetKeywords = [
    'budget', 'budgets', 'over budget', 'under budget', 'budget left',
    'budget remaining', 'remaining budget', 'budget used', 'budget spent',
    'compliance', 'align', 'alignment', 'exceed', 'within budget',
    'budget status', 'budget summary', 'budget alignment'
  ];
  
  // Categories keywords
  const categoriesKeywords = [
    'add category', 'new category', 'create category', 'list categories',
    'categories available', 'show categories', 'what categories',
    'category type', 'categories for'
  ];
  
  // Actions - separate category for actions (addEntry, setBudget, addCategory)
  const actionKeywords = ['add', 'create', 'new', 'set', 'update', 'record', 'insert', 'make'];
  const isAction = actionKeywords.some(keyword => promptLower.includes(keyword));
  
  // Check for action queries first (they need action functions)
  if (isAction && (
    promptLower.includes('entry') || 
    promptLower.includes('expense') || 
    promptLower.includes('income') || 
    promptLower.includes('transaction') ||
    promptLower.includes('budget') ||
    promptLower.includes('category') ||
    promptLower.includes('spending') ||
    promptLower.includes('savings')
  )) {
    stores.add('actions');
    // Also include the relevant data store for context
    if (promptLower.includes('entry') || promptLower.includes('expense') || 
        promptLower.includes('income') || promptLower.includes('transaction') ||
        promptLower.includes('spending') || promptLower.includes('savings')) {
      stores.add('entries');
    }
    if (promptLower.includes('budget')) {
      stores.add('budget');
    }
    if (promptLower.includes('category')) {
      stores.add('categories');
    }
  }
  
  // Check for entries (query-only, not actions)
  if (!isAction && entriesKeywords.some(keyword => promptLower.includes(keyword))) {
    stores.add('entries');
  }
  
  // Check for budget (query-only, not actions)
  if (!isAction && budgetKeywords.some(keyword => promptLower.includes(keyword))) {
    stores.add('budget');
  }
  
  // Check for categories (query-only, not actions)
  if (!isAction && categoriesKeywords.some(keyword => promptLower.includes(keyword))) {
    stores.add('categories');
  }
  
  // If no specific matches, include all (fallback for ambiguous queries)
  if (stores.size === 0) {
    stores.add('entries');
    stores.add('budget');
    stores.add('categories');
  }
  
  // Always include utilities for context
  stores.add('auth');
  // Categories utility functions are often needed with entries/budget queries
  if (stores.has('entries') || stores.has('budget')) {
    stores.add('categories');
  }
  
  return Array.from(stores);
}

/**
 * Get relevant functions based on detected stores
 * @param {string} prompt - User's prompt
 * @returns {Array} - Filtered function array for OpenAI
 */
function getRelevantFunctions(prompt) {
  const relevantStores = detectRelevantStores(prompt);
  const relevantFunctions = [];
  
  relevantStores.forEach(store => {
    const storeFunctions = getFunctionsByStore(store);
    relevantFunctions.push(...storeFunctions);
  });
  
  // Remove duplicates (in case a function appears in multiple contexts)
  const uniqueFunctions = Array.from(
    new Map(relevantFunctions.map(func => [func.name, func])).values()
  );
  
  return uniqueFunctions.map((func) => ({
    name: func.name,
    description: func.description,
    parameters: func.parameters,
  }));
}

// Function catalog initialized with FUNCTION_CATALOG.length functions

module.exports = {
  FUNCTION_CATALOG,
  validateFunctionParameters,
  getFunctionDefinition,
  getAvailableFunctionNames,
  getFunctionsByStore,
  detectRelevantStores,
  getRelevantFunctions,
};

