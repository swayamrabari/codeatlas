# Function Catalog Integration with Zustand Stores

This document explains how the function catalog works with Zustand stores for proper execution and error handling in the TrackIt application.

## Overview

The function catalog system provides a bridge between the server-side AI assistant and the client-side Zustand stores, enabling the AI to execute functions on your financial data with proper validation, error handling, and type safety.

## Architecture

```
Server (Node.js)                    Client (React/TypeScript)
├── functionCatalog.js              ├── functionExecutor.ts
├── assistantController.js          ├── Zustand Stores
└── routes/assistant.js             │   ├── entriesStore.ts
                                    │   ├── budgetStore.ts
                                    │   ├── categoriesStore.ts
                                    │   └── authStore.ts
                                    └── testIntegration.ts
```

## Components

### 1. Function Catalog (`server/utils/functionCatalog.js`)

The function catalog defines all available functions that the AI assistant can call:

- **Function Definitions**: Each function has a name, description, parameters schema, and return description
- **Parameter Validation**: Comprehensive validation for required parameters, types, enums, and formats
- **Store Mapping**: Each function is mapped to its corresponding Zustand store
- **Utility Functions**: Helper functions for catalog management

#### Key Features:
- ✅ Parameter validation with detailed error messages
- ✅ Type checking (string, number, boolean, date)
- ✅ Enum validation for predefined values
- ✅ Date format validation (YYYY-MM-DD)
- ✅ Range validation for numeric parameters
- ✅ Required parameter checking

### 2. Function Executor (`client/src/utils/functionExecutor.ts`)

The function executor handles the actual execution of functions on Zustand stores:

- **Store Integration**: Direct access to all Zustand stores
- **Error Handling**: Comprehensive error handling with custom error classes
- **Performance Tracking**: Execution time measurement
- **Type Safety**: Full TypeScript support with proper interfaces
- **Function Metadata**: Utility functions for function discovery

#### Key Features:
- ✅ Type-safe function execution
- ✅ Custom error classes with context
- ✅ Performance monitoring
- ✅ Store-specific function grouping
- ✅ Function existence validation

## Available Functions

### Entry Management Functions
- `getAllEntries()` - Get all financial entries
- `getEntriesByType(type)` - Get entries by type (income/expense/investment/savings)
- `getTotalByType(type)` - Get total amount for a type
- `getEntriesByCategory(type, category)` - Get entries by type and category
- `getEntriesByDateRange(startDate, endDate, type?)` - Get entries in date range
- `getTopCategories(type, limit?)` - Get top spending categories

### Budget Management Functions
- `getAllBudgets()` - Get all budget entries
- `getBudgetsByType(type)` - Get budgets by type
- `getBudgetProgress(budgetId)` - Get budget progress information
- `getBudgetsByCategory(type, category)` - Get budgets by type and category
- `getOverBudgetCategories(type)` - Get over-budget categories

### Category Management Functions
- `getAllCategories()` - Get all available categories
- `getCategoriesByType(type)` - Get categories for a specific type

### User Management Functions
- `getUserInfo()` - Get current user information
- `isAuthenticated()` - Check authentication status

### Analytics Functions
- `getMonthlySummary(year, month)` - Get comprehensive monthly summary
- `getYearlySummary(year)` - Get comprehensive yearly summary
- `getSpendingTrends(type, period, limit?)` - Get spending trends over time

## Usage Examples

### Basic Function Execution

```typescript
import { executeFunction } from '@/utils/functionExecutor';

// Get all entries
const result = await executeFunction('getAllEntries', {});
if (result.success) {
  console.log('Entries:', result.data);
} else {
  console.error('Error:', result.error);
}

// Get entries by type
const expenseResult = await executeFunction('getEntriesByType', { 
  type: 'expense' 
});

// Get monthly summary
const monthlyResult = await executeFunction('getMonthlySummary', {
  year: 2025,
  month: 1
});
```

### Error Handling

```typescript
const result = await executeFunction('getBudgetProgress', {
  budgetId: 'invalid-id'
});

if (!result.success) {
  console.error('Function failed:', result.error);
  console.error('Function name:', result.functionName);
  console.error('Execution time:', result.executionTime);
}
```

### Function Discovery

```typescript
import { 
  getAvailableFunctions, 
  getFunctionsByStore, 
  functionExists,
  getFunctionMetadata 
} from '@/utils/functionExecutor';

// Get all available functions
const functions = getAvailableFunctions();

// Get functions by store
const entryFunctions = getFunctionsByStore('entries');
const budgetFunctions = getFunctionsByStore('budget');

// Check if function exists
const exists = functionExists('getAllEntries');

// Get function metadata
const metadata = getFunctionMetadata('getAllEntries');
console.log(metadata?.store); // 'entries'
```

## Error Handling

The system provides comprehensive error handling at multiple levels:

### 1. Parameter Validation Errors
- Missing required parameters
- Invalid parameter types
- Invalid enum values
- Invalid date formats
- Out-of-range numeric values

### 2. Function Execution Errors
- Unknown function names
- Store access errors
- Data processing errors
- Network/API errors

### 3. Custom Error Classes
```typescript
class FunctionExecutionError extends Error {
  functionName: string;
  parameters: Record<string, any>;
  timestamp: Date;
}
```

## Type Safety

The system provides full TypeScript support:

### Parameter Types
```typescript
interface EntryType {
  type: 'income' | 'expense' | 'investment' | 'savings';
}

interface DateRangeFilter {
  startDate: string;
  endDate: string;
  type?: 'income' | 'expense' | 'investment' | 'savings';
}
```

### Result Types
```typescript
interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  functionName?: string;
  executionTime?: number;
}
```

## Testing

### Integration Test
Run the integration test to verify everything works:

```typescript
import { runIntegrationTest } from '@/utils/testIntegration';

// Run the test
await runIntegrationTest();
```

### Unit Tests
The system includes comprehensive unit tests in `client/src/utils/__tests__/functionExecutor.test.ts`.

## Performance Monitoring

The system tracks execution time for all functions:

```typescript
const result = await executeFunction('getAllEntries', {});
console.log(`Execution time: ${result.executionTime}ms`);
```

## Best Practices

1. **Always check success**: Check `result.success` before using `result.data`
2. **Handle errors gracefully**: Provide meaningful error messages to users
3. **Use type safety**: Leverage TypeScript interfaces for better development experience
4. **Monitor performance**: Use execution time data to identify slow functions
5. **Validate parameters**: The system validates parameters, but you can add additional validation if needed

## Troubleshooting

### Common Issues

1. **Function not found**: Check if the function name is correct and exists in the catalog
2. **Parameter validation errors**: Ensure all required parameters are provided with correct types
3. **Store access errors**: Verify that Zustand stores are properly initialized
4. **Type errors**: Ensure you're using the correct TypeScript interfaces

### Debug Mode

Enable debug logging by setting the appropriate environment variable or using browser dev tools to inspect function calls and results.

## Future Enhancements

- [ ] Add caching for frequently accessed data
- [ ] Implement function result caching
- [ ] Add more sophisticated analytics functions
- [ ] Add real-time data synchronization
- [ ] Implement function execution queuing for batch operations
