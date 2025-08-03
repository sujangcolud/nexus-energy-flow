
import { supabase } from "@/integrations/supabase/client";

/**
 * Security event logging utility
 * Logs security-sensitive events for audit trails
 */
export const logSecurityEvent = async (
  userId: string | null,
  action: string,
  tableName: string,
  recordId: string,
  details: Record<string, any> = {}
) => {
  try {
    // Only log if we have a valid user or it's a system event
    if (!userId && !["LOGIN_FAILED", "SIGNUP_FAILED"].includes(action)) {
      return;
    }

    const { error } = await supabase.rpc('log_security_event', {
      p_user_id: userId,
      p_action: action,
      p_table_name: tableName,
      p_record_id: recordId,
      p_details: details
    });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

/**
 * Log role changes for audit trail
 */
export const logRoleChange = async (
  adminUserId: string,
  targetUserId: string,
  oldRole: string,
  newRole: string
) => {
  await logSecurityEvent(
    adminUserId,
    "ROLE_CHANGED",
    "user_roles",
    targetUserId,
    {
      target_user_id: targetUserId,
      old_role: oldRole,
      new_role: newRole,
      changed_by: adminUserId
    }
  );
};

/**
 * Log access attempts to restricted resources
 */
export const logAccessAttempt = async (
  userId: string,
  resource: string,
  granted: boolean,
  reason?: string
) => {
  await logSecurityEvent(
    userId,
    granted ? "ACCESS_GRANTED" : "ACCESS_DENIED",
    "access_control",
    resource,
    {
      resource,
      granted,
      reason
    }
  );
};

/**
 * Log data modification events
 */
export const logDataModification = async (
  userId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  tableName: string,
  recordId: string,
  oldData?: any,
  newData?: any
) => {
  await logSecurityEvent(
    userId,
    `DATA_${action}`,
    tableName,
    recordId,
    {
      action,
      old_data: oldData,
      new_data: newData
    }
  );
};
