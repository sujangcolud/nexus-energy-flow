// Utility for extracting meaningful error messages from Supabase errors
export function extractErrorMessage(error: any): string {
  if (!error) return "An unknown error occurred";

  // If it's already a string, return it
  if (typeof error === "string") return error;

  // Extract message from various error object structures
  const message =
    error.message ||
    error["message"] ||
    error.details ||
    error["details"] ||
    error.hint ||
    error["hint"] ||
    error.error_description ||
    error["error_description"] ||
    null;

  const code = error.code || error["code"] || null;

  // If we have a meaningful message, return it
  if (message && typeof message === "string" && message.trim() !== "") {
    return code ? `${message} (${code})` : message;
  }

  // If we have a code but no message, return code info
  if (code) {
    return `Database error: ${code}`;
  }

  // Last resort - try to stringify the error object
  try {
    const errorStr = JSON.stringify(error, null, 2);
    if (errorStr && errorStr !== "{}") {
      return `Error: ${errorStr}`;
    }
  } catch (e) {
    // JSON.stringify failed
  }

  // Ultimate fallback
  return "An unexpected error occurred";
}

// Enhanced logging function for better debugging
export function logError(context: string, error: any): void {
  console.group(`🔥 Error in ${context}`);
  console.error("Raw error:", error);
  console.error("Error type:", typeof error);
  console.error("Error message:", extractErrorMessage(error));

  if (error && typeof error === "object") {
    console.error("Error properties:", Object.keys(error));
    console.error("Error.message:", error.message);
    console.error("Error.details:", error.details);
    console.error("Error.code:", error.code);
  }

  console.groupEnd();
}
