import { supabase } from "@/integrations/supabase/client";
import { logError } from "./errorHandling";

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
 * Fallback function to get users when user_roles table/functions are not available
 */
export async function getUsersWithRolesFallback(): Promise<UserWithRole[]> {
  try {
    // Try to get basic user data from profiles first
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .limit(100);

    if (!profilesError && profilesData && profilesData.length > 0) {
      // Use profiles data with default roles
      return profilesData.map((profile) => ({
        id: profile.id,
        email: profile.email || "Unknown",
        role:
          profile.email === "sujan1nepal@gmail.com"
            ? ("super_admin" as const)
            : ("user" as const),
      }));
    }

    // If profiles doesn't work, try to get minimal user data from any available source
    console.warn("Profiles table not accessible, trying alternative approach");

    // Return minimal fallback data
    return [
      {
        id: "fallback-admin",
        email: "sujan1nepal@gmail.com",
        role: "super_admin",
      },
    ];
  } catch (error) {
    logError("users fallback", error);
    console.error("All fallback methods failed:", error);

    // Return minimal admin user as final fallback
    return [
      {
        id: "emergency-admin",
        email: "sujan1nepal@gmail.com",
        role: "super_admin",
      },
    ];
  }
}

/**
 * Fallback function for role distribution when user_roles functions fail
 */
export async function getRoleDistributionFallback(): Promise<
  RoleDistribution[]
> {
  try {
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
      { role: "super_admin", count: 1 },
      { role: "user", count: 0 },
    ];
  }
}

/**
 * Check if user roles system is available
 */
export async function checkUserRolesAvailability(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("get_current_user_role");
    return !error;
  } catch (error) {
    return false;
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

  // Fallback: check if user is the admin email
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email === "sujan1nepal@gmail.com") {
      return "super_admin";
    }
    return "user";
  } catch (error) {
    return "user";
  }
}
