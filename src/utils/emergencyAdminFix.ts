
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "./securityLogger";

/**
 * Emergency function to fix admin role - DEPRECATED
 * This function is kept for compatibility but should not be used
 * All role management should go through proper channels
 */
export async function fixAdminRole(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log("Emergency admin fix requested - this function is deprecated");

    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        message: "User not authenticated"
      };
    }

    // Log the emergency access attempt
    await logSecurityEvent(
      user.id,
      "EMERGENCY_ADMIN_FIX_ATTEMPTED",
      "user_roles",
      user.id,
      {
        email: user.email,
        timestamp: new Date().toISOString()
      }
    );

    return {
      success: false,
      message: "Emergency admin fix is deprecated. Please contact system administrator for role changes."
    };

  } catch (error: any) {
    console.error("Emergency admin fix error:", error);
    return {
      success: false,
      message: `Access denied: ${error.message}`
    };
  }
}
