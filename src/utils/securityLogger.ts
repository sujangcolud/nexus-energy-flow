
import { supabase } from "@/integrations/supabase/client";
import { logError } from "./errorHandling";

/**
 * Log security events
 */
export async function logSecurityEvent(
  userId: string | null,
  event: string,
  category: string,
  actor: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    // Since log_security_event RPC function doesn't exist, 
    // we'll log to the regular logs table instead
    const { error } = await supabase
      .from('logs')
      .insert({
        user_id: userId,
        action: event,
        table_name: category,
        record_id: actor,
        details: details ? JSON.stringify(details) : null
      });

    if (error) {
      console.warn('Failed to log security event:', error.message);
      // Don't throw error to avoid breaking the main functionality
    }
  } catch (error) {
    logError('logging security event', error);
    // Don't throw error to avoid breaking the main functionality
  }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  userId: string | null,
  event: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'PASSWORD_CHANGE',
  details?: Record<string, any>
): Promise<void> {
  await logSecurityEvent(userId, event, 'authentication', userId || 'anonymous', details);
}

/**
 * Log access control events
 */
export async function logAccessEvent(
  userId: string | null,
  event: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'ROLE_CHANGE',
  resource: string,
  details?: Record<string, any>
): Promise<void> {
  await logSecurityEvent(userId, event, 'access_control', resource, details);
}

/**
 * Log data modification events
 */
export async function logDataEvent(
  userId: string | null,
  event: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_IMPORT',
  table: string,
  recordId: string,
  details?: Record<string, any>
): Promise<void> {
  await logSecurityEvent(userId, event, table, recordId, details);
}
