import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface UserPermission {
  user_id: string;
  tab_id: string;
  enabled: boolean;
}

export const useUserPermissions = () => {
  const { user } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["user-tab-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_tab_permissions")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        // If table doesn't exist or other error, return empty array (defaults to allow all)
        console.warn("User permissions query failed:", error);
        return [];
      }

      return data as UserPermission[];
    },
    enabled: !!user?.id,
  });

  const hasTabAccess = (tabId: string): boolean => {
    if (!user?.id) return false;

    // If no permissions are loaded or found, default to allowing access
    if (permissions.length === 0) return true;

    // Find specific permission for this tab
    const permission = permissions.find((p) => p.tab_id === tabId);

    // If no specific permission exists, default to allow
    if (!permission) return true;

    // Return the explicit permission
    return permission.enabled;
  };

  const getAccessibleTabs = (
    allTabs: Array<{ id: string; [key: string]: any }>,
  ) => {
    return allTabs.filter((tab) => hasTabAccess(tab.id));
  };

  return {
    permissions,
    isLoading,
    hasTabAccess,
    getAccessibleTabs,
  };
};
