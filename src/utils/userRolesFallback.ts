
import { supabase } from "@/integrations/supabase/client";
import { logError } from "./errorHandling";
import { logSecurityEvent } from "./securityLogger";

export interface UserWithRole {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "user" | "data_entry" | "reports_viewer" | "super_admin";
  created_at: string;
}

export interface RoleDistribution {
  role: string;
  count: number;
}

/**
 * Helper function to validate and convert role strings
 */
function validateRole(role: string | null | undefined): "user" | "data_entry" | "reports_viewer" | "super_admin" {
  const validRoles = ["user", "data_entry", "reports_viewer", "super_admin"] as const;
  if (role && validRoles.includes(role as any)) {
    return role as "user" | "data_entry" | "reports_viewer" | "super_admin";
  }
  return "user";
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
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        role: validateRole(user.role),
        created_at: user.created_at || new Date().toISOString()
      }));
    }

    // Try to get basic user data from profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, created_at, role")
      .limit(100);

    if (!profilesError && profilesData && profilesData.length > 0) {
      return profilesData.map((profile) => ({
        id: profile.id,
        email: profile.email || "Unknown",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        role: validateRole(profile.role),
        created_at: profile.created_at || new Date().toISOString()
      }));
    }

    return [];
  } catch (error) {
    logError("users fallback", error);
    return [];
  }
}

/**
 * Update user role in both profiles and user_roles tables
 */
export async function updateUserRole(
  userId: string, 
  newRole: "user" | "data_entry" | "reports_viewer" | "super_admin"
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile role:", profileError);
    }

    // Update user_roles table
    const { error: userRolesError } = await supabase
      .from("user_roles")
      .upsert({ 
        user_id: userId, 
        role: newRole 
      }, { 
        onConflict: 'user_id' 
      });

    if (userRolesError) {
      console.error("Error updating user_roles:", userRolesError);
    }

    // Log the role change
    await logSecurityEvent(
      userId,
      "ROLE_CHANGED",
      "user_roles",
      userId,
      { newRole }
    );

    return { success: true };
  } catch (error) {
    logError("updating user role", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Fallback function for role distribution
 */
export async function getRoleDistributionFallback(): Promise<RoleDistribution[]> {
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_role_distribution');
    
    if (!rpcError && rpcData) {
      return rpcData.map(item => ({
        role: item.role,
        count: Number(item.user_count)
      }));
    }

    const users = await getUsersWithRolesFallback();
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
    return [{ role: "user", count: 0 }];
  }
}

/**
 * Get current user role with fallback
 */
export async function getCurrentUserRoleWithFallback(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("get_current_user_role");
    if (!error && data) {
      return data;
    }
  } catch (error) {
    logError("getting current user role", error);
  }
  return "user";
}
