const OpenAI = require('openai');
const logger = require('../utils/logger');
const {
  FUNCTION_CATALOG,
  validateFunctionParameters,
  getRelevantFunctions,
} = require('../utils/functionCatalog');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Retry helper with exponential backoff for handling rate limits
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} - Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Check if it's a rate limit error (429)
      // OpenAI SDK uses error.status or error.statusCode
      const isRateLimit = 
        error.status === 429 || 
        error.statusCode === 429 ||
        error.response?.status === 429 ||
        error.code === 'rate_limit_exceeded';
      
      if (isRateLimit) {
        if (attempt === maxRetries - 1) {
          // Last attempt failed
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        // Get retry-after header if available, otherwise use exponential backoff
        const retryAfter = error.response?.headers?.['retry-after'] 
          ? parseInt(error.response.headers['retry-after']) * 1000 
          : baseDelay * Math.pow(2, attempt);
        
        const delay = Math.min(retryAfter, 60000); // Cap at 60 seconds
        logger.warn('Rate limit retry', { delay, attempt: attempt + 1, maxRetries });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
}

async function getAssistantResponse(req, res) {
  try {
    const { prompt, functionResults, conversationHistory } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Build messages array starting with system message
    const messages = [
      {
        role: 'system',
        content: `TrackIt financial assistant. Use functions for queries.

RULES:
- NO currency symbols (use numbers only)
- Format: commas for thousands, 2 decimals
- Be concise and friendly

CRITICAL: BUDGET CREATION
- Budgets use PERIOD (monthly/quarterly/half-yearly/yearly), NOT start/end dates
- When creating budgets, ONLY ask for: type, category, amount, period
- DO NOT ask for start date, end date, or date range for budgets
- Budgets automatically calculate based on the current period
- Multiple budgets with same category/period are ALLOWED - each will be created separately

FUNCTION GUIDELINES:
1. Sequential rankings: Use getTopCategories with topN (e.g., topN=3 for "most expensive" + follow-ups)
2. Budget left: Use getBudgetRemaining (returns spent, remaining, details) - NOT getTotalBudget
3. Multiple budgets: List all periods, ask which one
4. List budgets: Use getAllBudgets
5. Budget alignment: Use getBudgetAlignmentSummary (shows critical budgets >80% or over)
6. Budget answers: Always include budget amount, spent, remaining, percentage used

ERROR HANDLING:
- When function results show success: false, inform the user about the error clearly
- DO NOT claim success if the function failed (check result.success field)
- If budget/entry creation fails, explain the error and suggest fixes

DATA FORMATTING:
- Numbers: 1,234.56 (no $, €, £, etc.)
- Budgets: Always show spent + remaining + percentage`,
      },
    ];

    // Add conversation history if provided (for context in follow-up questions)
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach((msg) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      });
    }

    // Add current prompt
    messages.push({ role: 'user', content: prompt });

    // Add function results if provided (from previous function calls)
    if (functionResults && functionResults.length > 0) {
      functionResults.forEach((result) => {
        // Add assistant's function call message
        messages.push({
          role: 'assistant',
          content: null,
          function_call: {
            name: result.functionName,
            arguments: JSON.stringify(result.parameters || {}),
          },
        });
        
        // Add function result
        messages.push({
          role: 'function',
          name: result.functionName,
          content: JSON.stringify(result.result),
        });
      });
    }

    // Only allow function calls if we don't have function results yet
    const completionOptions = {
      model: 'gpt-4o-mini',
      messages: messages,
    };

    // Only include functions if we're not processing function results
    if (!functionResults || functionResults.length === 0) {
      // Use dynamic function filtering based on prompt to save tokens
      const relevantFunctions = getRelevantFunctions(prompt);
      completionOptions.functions = relevantFunctions;
      completionOptions.function_call = 'auto';
      
      // Log token optimization in development
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Token optimization', { 
          functionsUsed: relevantFunctions.length, 
          totalFunctions: FUNCTION_CATALOG.length,
          promptPreview: prompt.substring(0, 50)
        });
      }
    }

    // Wrap OpenAI API call with retry logic for rate limiting
    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create(completionOptions);
    }, 3, 1000); // 3 retries, starting with 1 second delay

    if (!response || !response.choices || !response.choices[0]) {
      logger.error('Unexpected OpenAI response', { response });
      return res.status(500).json({ error: 'Invalid response from OpenAI' });
    }

    const message = response.choices[0].message;

    // Check if the assistant wants to call a function
    if (message.function_call) {
      const functionName = message.function_call.name;
      const functionArgs = JSON.parse(message.function_call.arguments || '{}');

      // Validate function parameters
      const validation = validateFunctionParameters(functionName, functionArgs);
      if (!validation.isValid) {
        logger.error('Function validation failed', { functionName, errors: validation.errors });
        return res.status(400).json({
          error: 'Invalid function parameters',
          details: validation.errors,
        });
      }

      logger.info('Function call requested', { functionName, userId: req.user?._id });

      // Return function call request to client
      return res.status(200).json({
        type: 'function_call',
        functionName: functionName,
        parameters: functionArgs,
        message: `I need to check your ${functionName
          .replace(/([A-Z])/g, ' $1')
          .toLowerCase()} data to answer your question.`,
      });
    }

    // Regular text response
    // Ensure we always have a valid response and clean it
    let cleanContent = message.content ? String(message.content).trim() : '';
    
    // Remove any trailing "undefined" strings that might be appended
    cleanContent = cleanContent.replace(/\s*undefined\s*$/gi, '').trim();
    
    if (!cleanContent) {
      logger.warn('OpenAI returned empty content', { userId: req.user?._id });
      return res.status(200).json({
        type: 'text',
        response: 'I processed your request successfully.',
      });
    }
    
    return res.status(200).json({
      type: 'text',
      response: cleanContent,
      });
  } catch (error) {
    logger.error('Assistant Error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?._id,
      prompt: req.body.prompt?.substring(0, 100)
    });
    
    // Handle rate limit errors specifically
    if (error.message?.includes('Rate limit') || error.status === 429 || error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        retryAfter: error.response?.headers?.['retry-after'] || 60
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch assistant response' });
  }
}

async function getFunctionCatalog(req, res) {
  try {
    res.status(200).json({
      functions: FUNCTION_CATALOG,
      count: FUNCTION_CATALOG.length,
    });
  } catch (error) {
    logger.error('Function catalog error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get function catalog' });
  }
}

module.exports = {
  getAssistantResponse,
  getFunctionCatalog,
};
