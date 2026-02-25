import api from "./index";
import { executeFunction, FunctionResult } from "@/utils/functionExecutor";

export interface AssistantResponse {
  type: "text" | "function_call";
  response?: string;
  functionName?: string;
  parameters?: Record<string, any>;
  message?: string;
  error?: string;
}

export const sendMessage = async (
  message: string,
  functionResults?: Array<{ functionName: string; parameters: Record<string, any>; result: FunctionResult }>,
  conversationHistory?: Array<{ role: string; content: string }>,
): Promise<AssistantResponse> => {
  try {
    const response = await api.post("/assistant", {
      prompt: message,
      functionResults,
      conversationHistory,
    });

    return response.data;
  } catch (error: any) {
    
    // Return a more detailed error message
    const errorMessage = error?.response?.data?.message 
      || error?.response?.data?.error 
      || error?.message 
      || "Something went wrong. Please check if the server is running and your OpenAI API key is configured.";
    
    return {
      type: "text",
      error: errorMessage,
    };
  }
};

export const executeFunctionCall = async (
  functionName: string,
  parameters: Record<string, any>,
): Promise<FunctionResult> => {
  return await executeFunction(functionName, parameters);
};

export const getFunctionCatalog = async () => {
  try {
    const response = await api.get("/assistant/functions");
    return response.data;
  } catch (error) {
    return {
      error:
        (error as any)?.response?.data?.message ||
        "Failed to get function catalog",
    };
  }
};
