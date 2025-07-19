// Utility for extracting meaningful error messages from Supabase errors
export function extractErrorMessage(error: any): string {
  if (!error) return "An unknown error occurred";

  // If it's already a string, return it
  if (typeof error === "string") return error;

  // Handle PostgreSQL/Supabase specific error structures
  const pgError = error.error || error;

  // Extract message from various error object structures
  const message =
    pgError.message ||
    error.message ||
    error["message"] ||
    pgError.details ||
    error.details ||
    error["details"] ||
    pgError.hint ||
    error.hint ||
    error["hint"] ||
    error.error_description ||
    error["error_description"] ||
    null;

  const code =
    pgError.code ||
    error.code ||
    error["code"] ||
    pgError.status ||
    error.status ||
    null;

  // Handle specific PostgreSQL error codes
  if (code) {
    switch (code) {
      case "42501":
        return "Access denied. Insufficient permissions.";
      case "42P01":
        return "Database table or function not found.";
      case "23505":
        return "Duplicate entry. Record already exists.";
      case "23503":
        return "Foreign key constraint violation.";
      case "PGRST204":
        return "No records found or access denied.";
      case "PGRST301":
        return "Database function not found.";
      default:
        break;
    }
  }

  // If we have a meaningful message, return it
  if (message && typeof message === "string" && message.trim() !== "") {
    return code ? `${message} (Code: ${code})` : message;
  }

  // If we have a code but no message, return code info
  if (code) {
    return `Database error: ${code}`;
  }

  // Check for nested error objects
  if (error.error && typeof error.error === "object") {
    return extractErrorMessage(error.error);
  }

  // Last resort - try to stringify the error object
  try {
    const errorStr = JSON.stringify(error, null, 2);
    if (errorStr && errorStr !== "{}") {
      // Clean up common noise in error messages
      const cleanedError = errorStr
        .replace(/\{[\s\S]*?"message":\s*"([^"]+)"[\s\S]*?\}/, "$1")
        .replace(/[{}"\[\]]/g, "")
        .trim();

      if (cleanedError && cleanedError !== "object Object") {
        return `Error: ${cleanedError}`;
      }
    }
  } catch (e) {
    // JSON.stringify failed
  }

  // Ultimate fallback
  return "An unexpected error occurred. Please check console for details.";
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
