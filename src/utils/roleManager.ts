
import { supabase } from "@/integrations/supabase/client";
import { logError } from "./errorHandling";

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export type RoleManagerRole = "user" | "data_entry" | "reports_viewer" | "super_admin";

/**
 * Get current user's role
 */
export async function getCurrentUserRole(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'user';

    // Try fallback approach - get from profiles table directly
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profileError && profile?.role) {
      return profile.role;
    }

    // Fallback: return default role
    return 'user';
  } catch (error) {
    logError('getting current user role', error);
    return 'user';
  }
}

/**
 * Check if current user has required role
 */
export async function hasRole(requiredRole: string): Promise<boolean> {
  try {
    const currentRole = await getCurrentUserRole();
    
    // Define role hierarchy
    const roleHierarchy: Record<string, number> = {
      'user': 1,
      'data_entry': 2,
      'reports_viewer': 3,
      'super_admin': 4
    };

    const currentLevel = roleHierarchy[currentRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return currentLevel >= requiredLevel;
  } catch (error) {
    logError('checking user role', error);
    return false;
  }
}

/**
 * Get all user roles (admin only)
 */
export async function getAllUserRoles(): Promise<UserRole[]> {
  try {
    const hasPermission = await hasRole('super_admin');
    if (!hasPermission) {
      throw new Error('Access denied. Super admin role required.');
    }

    // Since user_roles table has issues, return empty array
    console.warn('User roles table has schema issues, returning empty array');
    return [];
  } catch (error) {
    logError('getting all user roles', error);
    return [];
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, newRole: string): Promise<boolean> {
  try {
    const hasPermission = await hasRole('super_admin');
    if (!hasPermission) {
      throw new Error('Access denied. Super admin role required.');
    }

    // Since user_roles table has schema issues, show info message
    console.warn('User role update is currently unavailable due to schema issues');
    return false;
  } catch (error) {
    logError('updating user role', error);
    return false;
  }
}

/**
 * RoleManager class for compatibility
 */
export class RoleManager {
  static async changeUserRole(
    userId: string, 
    newRole: RoleManagerRole, 
    adminUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await updateUserRole(userId, newRole);
      return { success: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
