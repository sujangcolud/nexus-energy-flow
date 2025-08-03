
import { supabase } from "@/integrations/supabase/client";
import { logRoleChange } from "./securityLogger";

export type UserRole = "user" | "data_entry" | "reports_viewer" | "super_admin";

/**
 * Secure role management utility
 */
export class RoleManager {
  /**
   * Change a user's role (only for super admins)
   */
  static async changeUserRole(
    targetUserId: string,
    newRole: UserRole,
    adminUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First verify the admin has permission
      const { data: adminRole, error: roleError } = await supabase.rpc(
        'get_current_user_role'
      );

      if (roleError || adminRole !== 'super_admin') {
        return {
          success: false,
          error: 'Access denied. Super admin role required.'
        };
      }

      // Get the current role for logging
      const { data: currentUser, error: userError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId)
        .single();

      const oldRole = currentUser?.role || 'user';

      // Update the role
      const { error: updateError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: targetUserId,
          role: newRole,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        return {
          success: false,
          error: updateError.message
        };
      }

      // Log the role change
      await logRoleChange(adminUserId, targetUserId, oldRole, newRole);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to change user role'
      };
    }
  }

  /**
   * Validate role transition is allowed
   */
  static isRoleTransitionAllowed(
    fromRole: UserRole,
    toRole: UserRole,
    currentUserRole: UserRole
  ): boolean {
    // Only super_admin can change roles
    if (currentUserRole !== "super_admin") return false;

    // Super admin can make any role transition
    return true;
  }

  /**
   * Get role hierarchy level
   */
  static getRoleLevel(role: UserRole): number {
    const hierarchy = {
      user: 1,
      data_entry: 2,
      reports_viewer: 3,
      super_admin: 4,
    };
    return hierarchy[role] || 0;
  }

  /**
   * Check if user has required permission level
   */
  static hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    return this.getRoleLevel(userRole) >= this.getRoleLevel(requiredRole);
  }
}
