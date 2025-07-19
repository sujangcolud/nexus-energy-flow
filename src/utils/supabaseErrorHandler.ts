import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";

/**
 * Handles Supabase errors, particularly authentication-related ones
 */
export const handleSupabaseError = (error: any): void => {
  if (!error) return;

  // Check for refresh token errors
  if (
    error.message?.includes("refresh_token_not_found") ||
    error.message?.includes("Invalid Refresh Token") ||
    error.message?.includes("AuthApiError: Invalid Refresh Token")
  ) {
    console.log("Invalid refresh token detected, signing out user");

    // Clear the session immediately
    supabase.auth.signOut().catch(console.error);

    // Show user-friendly message
    toast.error("Your session has expired. Please sign in again.");

    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = "/";
    }, 2000);

    return;
  }

  // Check for other auth errors
  if (
    error.message?.includes("Auth session missing") ||
    error.message?.includes("AuthSessionMissingError") ||
    error.status === 401
  ) {
    console.log("Auth session missing, redirecting to login");

    // Clear the session
    supabase.auth.signOut().catch(console.error);

    toast.error("Please sign in to continue.");

    setTimeout(() => {
      window.location.href = "/";
    }, 1500);

    return;
  }

  // Log other errors
  console.error("Supabase error:", error);
};

/**
 * Wraps a Supabase call with error handling
 */
export const withSupabaseErrorHandling = async <T>(
  operation: () => Promise<T>,
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

/**
 * Global error handler that can be attached to window for unhandled promise rejections
 */
export const setupGlobalErrorHandler = (): void => {
  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;

    if (
      error?.message?.includes("Invalid Refresh Token") ||
      error?.message?.includes("refresh_token_not_found")
    ) {
      console.log("Unhandled refresh token error detected");
      handleSupabaseError(error);
      event.preventDefault(); // Prevent the error from being logged to console
    }
  });

  // Handle regular errors
  window.addEventListener("error", (event) => {
    const error = event.error;

    if (
      error?.message?.includes("Invalid Refresh Token") ||
      error?.message?.includes("refresh_token_not_found")
    ) {
      console.log("Unhandled refresh token error detected");
      handleSupabaseError(error);
    }
  });
};
