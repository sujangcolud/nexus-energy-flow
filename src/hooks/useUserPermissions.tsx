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
    // Show all tabs to all users (role restrictions removed as requested)
    return !!user?.id;
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
