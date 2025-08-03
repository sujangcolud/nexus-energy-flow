
import { supabase } from "@/integrations/supabase/client";
import { logError } from "./errorHandling";
import { logSecurityEvent } from "./securityLogger";

export interface UserWithRole {
  id: string;
  email: string;
  role: "user" | "data_entry" | "reports_viewer" | "super_admin";
}

export interface RoleDistribution {
  role: string;
  count: number;
}

/**
 * Enhanced fallback function with proper security logging
 */
export async function getUsersWithRolesFallback(): Promise<UserWithRole[]> {
  try {
    // First try the proper RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_users_with_roles');
    
    if (!rpcError && rpcData) {
      return rpcData.map(user => ({
        id: user.id,
        email: user.email || "Unknown",
        role: user.role as any || 'user'
      }));
    }

    // Log the fallback usage
    await logSecurityEvent(
      null,
      "USERS_FALLBACK_USED",
      "user_management",
      "system",
      { error: rpcError?.message }
    );

    // Try to get basic user data from profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .limit(100);

    if (!profilesError && profilesData && profilesData.length > 0) {
      // Get roles from user_roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const rolesMap = new Map(
        rolesData?.map(r => [r.user_id, r.role]) || []
      );

      return profilesData.map((profile) => ({
        id: profile.id,
        email: profile.email || "Unknown",
        role: rolesMap.get(profile.id) || 'user',
      }));
    }

    // Final fallback - return empty array with security warning
    await logSecurityEvent(
      null,
      "USERS_FALLBACK_FAILED",
      "user_management", 
      "system",
      { profilesError: profilesError?.message }
    );

    return [];
  } catch (error) {
    logError("users fallback", error);
    console.error("All fallback methods failed:", error);

    // Log the complete failure
    await logSecurityEvent(
      null,
      "USERS_FALLBACK_CRITICAL_FAILURE",
      "user_management",
      "system",
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    return [];
  }
}

/**
 * Fallback function for role distribution with security logging
 */
export async function getRoleDistributionFallback(): Promise<RoleDistribution[]> {
  try {
    // Try proper RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_role_distribution');
    
    if (!rpcError && rpcData) {
      return rpcData.map(item => ({
        role: item.role,
        count: Number(item.user_count)
      }));
    }

    const users = await getUsersWithRolesFallback();

    // Count roles manually
    const roleCount: Record<string, number> = {};
    users.forEach((user) => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });

    return Object.entries(roleCount).map(([role, count]) => ({
      role,
      count,
    }));
  } catch (error) {
    logError("role distribution fallback", error);

    // Return minimal distribution
    return [
      { role: "user", count: 0 },
    ];
  }
}

/**
 * Check if user roles system is available with security logging
 */
export async function checkUserRolesAvailability(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("get_current_user_role");
    const isAvailable = !error;
    
    if (!isAvailable) {
      await logSecurityEvent(
        null,
        "USER_ROLES_SYSTEM_UNAVAILABLE",
        "system",
        "check",
        { error: error?.message }
      );
    }
    
    return isAvailable;
  } catch (error) {
    await logSecurityEvent(
      null,
      "USER_ROLES_SYSTEM_CHECK_FAILED",
      "system",
      "check",
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
    return false;
  }
}

/**
 * Get current user role with enhanced fallback and logging
 */
export async function getCurrentUserRoleWithFallback(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("get_current_user_role");
    if (!error && data) {
      return data;
    }

    // Log the fallback usage
    const { data: { user } } = await supabase.auth.getUser();
    await logSecurityEvent(
      user?.id || null,
      "ROLE_CHECK_FALLBACK",
      "user_roles",
      user?.id || "unknown",
      { error: error?.message }
    );
  } catch (error) {
    logError("getting current user role", error);
  }

  // Fallback: default to 'user'
  return "user";
}
