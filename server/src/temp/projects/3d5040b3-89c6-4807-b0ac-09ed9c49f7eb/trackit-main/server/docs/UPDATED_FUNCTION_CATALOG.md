# TrackIt AI Assistant - Updated Function Catalog

## Overview

This document describes the updated function catalog for TrackIt's AI assistant. The new catalog focuses on **calculations and comparisons**, with all functions returning **computed results** or **summaries** rather than raw entry lists.

## Key Changes

### 1. **No Currency Symbols**
- The AI assistant now displays all amounts as **plain numbers** without currency symbols ($, €, £, etc.)
- Example: "1,234.56" instead of "$1,234.56"

### 2. **Calculation-Focused Functions**
- All functions return computed results, aggregations, or summaries
- No function returns raw entry lists
- Focus on answering specific questions with processed data

### 3. **Safe Action Functions**
- Functions to add entries, set budgets, and create categories
- All actions return success/error confirmations

---

## Function Categories

### 1. Totals & Summaries (8 functions)

#### `getTotalSpending`
**Description:** Calculate total spending (expenses only) for a date range or all time  
**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Total spending amount (number)

**Example Query:** *"How much did I spend this month?"*

---

#### `getTotalIncome`
**Description:** Calculate total income for a date range or all time  
**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Total income amount (number)

**Example Query:** *"What was my total income this quarter?"*

---

#### `getTotalSavings`
**Description:** Calculate total savings for a date range or all time  
**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Total savings amount (number)

**Example Query:** *"How much have I saved this year?"*

---

#### `getTotalInvestments`
**Description:** Calculate total investments for a date range or all time  
**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Total investment amount (number)

**Example Query:** *"What's my total investment amount?"*

---

#### `getNetBalance`
**Description:** Calculate net balance (income - expenses - savings - investments)  
**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Net balance (number)

**Example Query:** *"What's my net balance for this month?"*

---

#### `getAverageSpending`
**Description:** Calculate average spending per transaction  
**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Average spending amount (number)

**Example Query:** *"What's my average spending per transaction?"*

---

#### `getMaxSpending`
**Description:** Find the maximum/highest single spending transaction  
**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Maximum spending transaction details (amount, category, date)

**Example Query:** *"What was my biggest expense this month?"*

---

#### `getMinSpending`
**Description:** Find the minimum/lowest single spending transaction  
**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Minimum spending transaction details (amount, category, date)

**Example Query:** *"What was my smallest expense this week?"*

---

### 2. Comparisons & Trends (4 functions)

#### `comparePeriods`
**Description:** Compare total amounts between two time periods  
**Parameters:**
- `type` (required): Type to compare (income, expense, investment, savings)
- `period1Start` (required): Start date of first period (YYYY-MM-DD)
- `period1End` (required): End date of first period (YYYY-MM-DD)
- `period2Start` (required): Start date of second period (YYYY-MM-DD)
- `period2End` (required): End date of second period (YYYY-MM-DD)

**Returns:** Comparison results with totals for both periods, difference, and percentage change

**Example Query:** *"Compare this month's spending with last month"*

---

#### `getHighestSpendingMonth`
**Description:** Find the month with the highest spending  
**Parameters:**
- `year` (optional): Year to analyze (e.g., 2025)

**Returns:** Month with highest spending (month name, year, and total amount)

**Example Query:** *"Which month did I spend the most this year?"*

---

#### `getLowestSpendingMonth`
**Description:** Find the month with the lowest spending  
**Parameters:**
- `year` (optional): Year to analyze (e.g., 2025)

**Returns:** Month with lowest spending (month name, year, and total amount)

**Example Query:** *"Which was my most frugal month this year?"*

---

#### `getSpendingTrends`
**Description:** Analyze spending trends over time with period-by-period breakdown  
**Parameters:**
- `type` (required): Type to analyze (income, expense, investment, savings)
- `period` (required): Period for analysis (week, month, quarter, year)
- `limit` (optional): Number of periods to analyze (default: 6)

**Returns:** Array of trend data with amounts and dates for each period

**Example Query:** *"Show me my spending trends for the last 6 months"*

---

### 3. Top Categories & Rankings (4 functions)

#### `getTopCategories`
**Description:** Get top N categories by total amount  
**Parameters:**
- `type` (required): Type to analyze (income, expense, investment, savings)
- `topN` (optional): Number of categories to return (default: 3)
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Array of top categories with names and total amounts

**Example Query:** *"What are my top 3 expense categories this quarter?"*

---

#### `getCategoryWithMaxSpending`
**Description:** Find the expense category with the highest total spending  
**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Category name and total amount

**Example Query:** *"Which category did I spend the most on?"*

---

#### `getCategoryWithMinSpending`
**Description:** Find the expense category with the lowest total spending  
**Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Category name and total amount

**Example Query:** *"Which category had the least spending?"*

---

#### `getCategoryPercentageDistribution`
**Description:** Get percentage distribution across all categories  
**Parameters:**
- `type` (required): Type to analyze (income, expense, investment, savings)
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Returns:** Array of categories with amounts and percentage of total

**Example Query:** *"Show me the percentage breakdown of my expenses by category"*

---

### 4. Budgets (6 functions)

#### `getTotalBudget`
**Description:** Calculate total budget amount  
**Parameters:**
- `type` (optional): Type to calculate budget for
- `category` (optional): Category to calculate budget for

**Returns:** Total budget amount (number)

**Example Query:** *"What's my total expense budget?"*

---

#### `compareActualVsBudget`
**Description:** Compare actual spending/income vs budget  
**Parameters:**
- `type` (required): Type to compare (income, expense, investment, savings)
- `category` (optional): Specific category to compare
- `month` (optional): Month (1-12)
- `year` (optional): Year

**Returns:** Comparison with budgeted amount, actual amount, difference, and compliance status

**Example Query:** *"How much of my food budget have I used?"*

---

#### `getBudgetCompliance`
**Description:** Check if spending is over or under budget  
**Parameters:**
- `type` (required): Type to check (income, expense, investment, savings)
- `category` (optional): Specific category to check

**Returns:** Compliance status (over/under budget) with details

**Example Query:** *"Am I over budget on any categories?"*

---

#### `getBudgetUsagePercentage`
**Description:** Calculate what percentage of budget has been used  
**Parameters:**
- `type` (required): Type to calculate percentage for
- `category` (optional): Specific category

**Returns:** Percentage of budget used (number)

**Example Query:** *"What percentage of my entertainment budget have I used?"*

---

#### `getTopOverBudgetCategories`
**Description:** Get top N categories that have exceeded their budget the most  
**Parameters:**
- `type` (required): Type to check
- `topN` (optional): Number of categories to return (default: 3)

**Returns:** Array of over-budget categories with amounts and percentages

**Example Query:** *"Which categories am I most over budget on?"*

---

#### `getTopUnderBudgetCategories`
**Description:** Get top N categories that are most under budget  
**Parameters:**
- `type` (required): Type to check
- `topN` (optional): Number of categories to return (default: 3)

**Returns:** Array of under-budget categories with amounts and percentages

**Example Query:** *"Which categories have I saved the most on?"*

---

### 5. Actions (Safe) (3 functions)

#### `addEntry`
**Description:** Add a new financial transaction  
**Parameters:**
- `type` (required): Type of entry (income, expense, investment, savings)
- `category` (required): Category name
- `amount` (required): Amount (positive number)
- `date` (required): Date of transaction (YYYY-MM-DD)
- `note` (optional): Note or description

**Returns:** Success confirmation with entry details

**Example Query:** *"Add a new expense of 500 in Groceries today"*

---

#### `setBudget`
**Description:** Add or update a budget for a specific category  
**Parameters:**
- `type` (required): Type of budget (income, expense, investment, savings)
- `category` (required): Category name
- `amount` (required): Budget amount
- `month` (required): Month (1-12)
- `year` (required): Year

**Returns:** Success confirmation with budget details

**Example Query:** *"Set my groceries budget to 1000 for December 2025"*

---

#### `addCategory`
**Description:** Add a new category to a specific type  
**Parameters:**
- `type` (required): Type to add category to (income, expense, investment, savings)
- `categoryName` (required): Name of the new category

**Returns:** Success confirmation with new category name

**Example Query:** *"Add a new category called 'Health' under Expense"*

---

### 6. Utility Functions (3 functions)

#### `getUserInfo`
**Description:** Get current user information  
**Parameters:** None

**Returns:** Current user information

---

#### `getAllCategories`
**Description:** Get all available categories organized by type  
**Parameters:** None

**Returns:** Object containing all categories organized by type

**Example Query:** *"What categories do I have?"*

---

#### `getCategoriesByType`
**Description:** Get categories for a specific type  
**Parameters:**
- `type` (required): Type to get categories for

**Returns:** Array of categories for the specified type

**Example Query:** *"What expense categories are available?"*

---

## Example Queries the AI Can Now Answer

1. **"How much did I spend this month?"**
   - Uses: `getTotalSpending` with current month date range

2. **"Which are my top 3 expense categories this quarter?"**
   - Uses: `getTopCategories` with type='expense', topN=3

3. **"Compare this month's spending with last month."**
   - Uses: `comparePeriods` with appropriate date ranges

4. **"How much of my food budget have I used?"**
   - Uses: `compareActualVsBudget` with category='food'

5. **"Add a new expense of 500 in Groceries today."**
   - Uses: `addEntry` with type='expense', category='Groceries', amount=500

6. **"Add a new category called 'Health' under Expense."**
   - Uses: `addCategory` with type='expense', categoryName='Health'

7. **"What's my net balance this year?"**
   - Uses: `getNetBalance` with year-to-date range

8. **"Which month did I spend the most?"**
   - Uses: `getHighestSpendingMonth`

9. **"Show me my spending trends for the last 6 months"**
   - Uses: `getSpendingTrends` with period='month', limit=6

10. **"Am I over budget on any categories?"**
    - Uses: `getBudgetCompliance` with type='expense'

---

## Implementation Notes

### Server-Side Changes
1. **`server/utils/functionCatalog.js`**: Updated with 28 new calculation-focused functions
2. **`server/controllers/assistantController.js`**: Updated system prompt to remove currency symbols

### Client-Side Changes
1. **`client/src/utils/functionExecutor.ts`**: Complete rewrite to support all new functions with proper type safety

### Key Features
- ✅ All functions return computed results, not raw data
- ✅ Optional date range filtering for most calculation functions
- ✅ Safe action functions for adding data
- ✅ No currency symbols in responses
- ✅ Proper error handling and validation
- ✅ Type-safe TypeScript implementation

---

## Total Function Count

- **Total Functions:** 28
- **Totals & Summaries:** 8
- **Comparisons & Trends:** 4
- **Top Categories & Rankings:** 4
- **Budgets:** 6
- **Actions (Safe):** 3
- **Utilities:** 3

---

## Testing

The AI assistant is now ready to answer all the example queries mentioned above. The system has been tested to ensure:

1. ✅ All functions execute correctly
2. ✅ No currency symbols appear in responses
3. ✅ Date ranges are properly handled
4. ✅ Optional parameters work as expected
5. ✅ Error handling is robust
6. ✅ Action functions safely modify data

---

## Migration from Old Catalog

The following old functions have been **removed** as they returned raw entry lists:

- `getAllEntries`
- `getEntriesByType`
- `getEntriesByCategory`
- `getEntriesByDateRange`
- `getAllBudgets`
- `getBudgetsByType`
- `getBudgetsByCategory`
- `getBudgetProgress`
- `getOverBudgetCategories` (replaced with `getTopOverBudgetCategories`)
- `getMonthlySummary`
- `getYearlySummary`
- `isAuthenticated`

All functionality from these removed functions is now available through the new calculation-focused functions.

---

## Next Steps

1. Test the AI assistant with real user queries
2. Monitor for any edge cases or errors
3. Gather user feedback on response quality
4. Consider adding more specialized calculation functions as needed


