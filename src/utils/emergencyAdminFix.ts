import { supabase } from "@/integrations/supabase/client";

/**
 * Emergency function to fix admin role for sujan1nepal@gmail.com
 * This should only be used when the database role is not properly set
 */
export async function fixAdminRole(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log("Attempting to fix admin role for sujan1nepal@gmail.com");

    // First, check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        message: "User not authenticated"
      };
    }

    if (user.email !== "sujan1nepal@gmail.com") {
      return {
        success: false,
        message: "This function can only be used by sujan1nepal@gmail.com"
      };
    }

    // Update profile role
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        role: "super_admin",
        first_name: "Sujan",
        last_name: "Nepal",
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error("Profile update error:", profileError);
      return {
        success: false,
        message: `Profile update failed: ${profileError.message}`
      };
    }

    // Try to update user_roles table if it exists
    try {
      const { error: userRoleError } = await supabase
        .from("user_roles")
        .upsert({
          user_id: user.id,
          role: "super_admin"
        });

      if (userRoleError) {
        console.warn("user_roles table update failed:", userRoleError.message);
      }
    } catch (err) {
      console.warn("user_roles table might not exist:", err);
    }

    console.log("Admin role fix completed successfully");
    
    return {
      success: true,
      message: "Admin role has been fixed. Please refresh the page to see changes."
    };

  } catch (error: any) {
    console.error("Emergency admin fix error:", error);
    return {
      success: false,
      message: `Fix failed: ${error.message}`
    };
  }
}
