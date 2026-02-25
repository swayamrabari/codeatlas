# TrackIt Assistant Function Catalog

This document describes the function catalog system that enables the TrackIt assistant to interact with client-side Zustand stores through server-side function calls.

## Overview

The function catalog system allows the AI assistant to:
1. **Request data** from client-side Zustand stores
2. **Execute functions** on the client with specific parameters
3. **Receive results** back from the client
4. **Generate natural language responses** based on the data

## Architecture

```
User Query → Server (OpenAI) → Function Call Request → Client (Zustand) → Function Result → Server (OpenAI) → Natural Language Response
```

## Server-Side Components

### 1. Function Catalog (`server/utils/functionCatalog.js`)

Contains all available functions with their definitions:

```javascript
{
  name: "getAllEntries",
  description: "Get all financial entries (income, expense, investment, savings)",
  parameters: {
    type: "object",
    properties: {},
    required: []
  },
  store: "entries",
  returns: "Array of all entries with id, type, category, amount, and date"
}
```

### 2. Assistant Controller (`server/controllers/assistantController.js`)

Handles OpenAI integration and function call processing:

- **Function Call Detection**: Identifies when OpenAI wants to call a function
- **Parameter Validation**: Validates function parameters before sending to client
- **Response Processing**: Handles both text and function call responses

### 3. Routes (`server/routes/assistant.js`)

- `POST /assistant` - Main assistant endpoint
- `GET /assistant/functions` - Get function catalog

## Client-Side Components

### 1. Function Executor (`client/src/utils/functionExecutor.ts`)

Executes functions on Zustand stores:

```typescript
export async function executeFunction(
  functionName: string,
  parameters: Record<string, any>
): Promise<FunctionResult>
```

### 2. Assistant API (`client/src/api/assistant.ts`)

Handles communication with the server:

```typescript
export const sendMessage = async (
  message: string, 
  functionResults?: Array<{ functionName: string; result: FunctionResult }>
): Promise<AssistantResponse>
```

### 3. Assistant Component (`client/src/pages/Assistant.tsx`)

Manages the chat interface and function call flow.

## Available Functions

### Entries Store Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `getAllEntries` | Get all financial entries | None | Array of all entries |
| `getEntriesByType` | Filter entries by type | `type: string` | Array of entries |
| `getTotalByType` | Get total amount by type | `type: string` | Number |
| `getEntriesByCategory` | Filter by type and category | `type: string, category: string` | Array of entries |
| `getEntriesByDateRange` | Filter by date range | `startDate: string, endDate: string, type?: string` | Array of entries |
| `getTopCategories` | Get top spending categories | `type: string, limit?: number` | Array of categories |

### Budget Store Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `getAllBudgets` | Get all budget entries | None | Array of budgets |
| `getBudgetsByType` | Filter budgets by type | `type: string` | Array of budgets |
| `getBudgetProgress` | Get budget progress | `budgetId: string` | Progress object |
| `getBudgetsByCategory` | Filter by type and category | `type: string, category: string` | Array of budgets |
| `getOverBudgetCategories` | Get over-budget categories | `type: string` | Array of over-budget items |

### Categories Store Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `getAllCategories` | Get all categories | None | Categories object |
| `getCategoriesByType` | Get categories by type | `type: string` | Array of categories |

### Auth Store Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `getUserInfo` | Get user information | None | User object |
| `isAuthenticated` | Check authentication | None | Boolean |

### Analytics Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `getMonthlySummary` | Get monthly summary | `year: number, month: number` | Summary object |
| `getYearlySummary` | Get yearly summary | `year: number` | Summary object |
| `getSpendingTrends` | Get spending trends | `type: string, period: string, limit?: number` | Trends array |

## Usage Examples

### Example 1: Get Total Expenses

**User Query**: "What was my total expense last month?"

**Flow**:
1. Server identifies need for `getEntriesByType` function
2. Client executes function with `type: "expense"`
3. Server receives expense data
4. Server generates natural response: "Your total expenses last month were ₹45,000"

### Example 2: Budget Analysis

**User Query**: "Am I over budget on groceries?"

**Flow**:
1. Server calls `getBudgetsByCategory` with `type: "expense", category: "groceries"`
2. Server calls `getBudgetProgress` for the grocery budget
3. Client returns budget progress data
4. Server generates response: "You've spent ₹2,100 out of your ₹1,800 grocery budget, which is 117% of your limit."

### Example 3: Spending Trends

**User Query**: "Show me my spending trends for the last 6 months"

**Flow**:
1. Server calls `getSpendingTrends` with `type: "expense", period: "month", limit: 6`
2. Client returns monthly spending data
3. Server generates response with trend analysis

## Error Handling

The system includes comprehensive error handling:

1. **Parameter Validation**: Server validates function parameters before sending to client
2. **Function Execution Errors**: Client catches and reports execution errors
3. **Network Errors**: API layer handles network failures gracefully
4. **Fallback Responses**: Assistant provides helpful error messages

## Testing

Run the test script to verify the function catalog:

```bash
node server/test-function-catalog.js
```

## Security Considerations

1. **Parameter Validation**: All function parameters are validated on the server
2. **Function Whitelist**: Only predefined functions can be executed
3. **No Direct Store Access**: Functions are executed through controlled interfaces
4. **Error Sanitization**: Error messages are sanitized before being sent to the client

## Future Enhancements

1. **Function Permissions**: Add user-based function permissions
2. **Caching**: Implement result caching for frequently accessed data
3. **Batch Operations**: Support multiple function calls in a single request
4. **Real-time Updates**: Push data updates to the assistant
5. **Custom Functions**: Allow users to define custom functions

## Troubleshooting

### Common Issues

1. **Function Not Found**: Check if the function exists in the catalog
2. **Parameter Validation Failed**: Verify parameter types and required fields
3. **Store Access Error**: Ensure the Zustand store is properly initialized
4. **Network Timeout**: Check server connectivity and response times

### Debug Mode

Enable debug logging by setting `DEBUG=true` in your environment variables.
