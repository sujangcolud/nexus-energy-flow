import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface EditPermissions {
  allowEditOrders: boolean;
  allowEditExpenses: boolean;
  allowEditDeposits: boolean;
  allowEditWithdrawals: boolean;
  allowEditCharging: boolean;
  allowEditSavings: boolean;
  allowEditVAT: boolean;
  allowEditInventory: boolean;
  allowEditShareInvestments: boolean;
  allowEditExpenseBookings: boolean;
  allowDeleteTransactions: boolean;
}

const defaultPermissions: EditPermissions = {
  allowEditOrders: true,
  allowEditExpenses: true,
  allowEditDeposits: true,
  allowEditWithdrawals: true,
  allowEditCharging: true,
  allowEditSavings: true,
  allowEditVAT: true,
  allowEditInventory: true,
  allowEditShareInvestments: true,
  allowEditExpenseBookings: true,
  allowDeleteTransactions: true,
};

export const useEditPermissions = () => {
  const [permissions, setPermissions] = useState<EditPermissions>(defaultPermissions);
  const { user } = useAuth();

  // Check if current user is super admin
  const { data: isSuperAdmin = false } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      if (error) {
        console.warn("Role check failed:", error);
        return false;
      }
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const loadPermissions = () => {
      const savedEditSettings = localStorage.getItem('editSettings');
      
      if (savedEditSettings) {
        try {
          const parsed = JSON.parse(savedEditSettings);
          setPermissions({
            allowEditOrders: parsed.allowEditOrders ?? true,
            allowEditExpenses: parsed.allowEditExpenses ?? true,
            allowEditDeposits: parsed.allowEditDeposits ?? true,
            allowEditWithdrawals: parsed.allowEditWithdrawals ?? true,
            allowEditCharging: parsed.allowEditCharging ?? true,
            allowEditSavings: parsed.allowEditSavings ?? true,
            allowEditVAT: parsed.allowEditVAT ?? true,
            allowEditInventory: parsed.allowEditInventory ?? true,
            allowEditShareInvestments: parsed.allowEditShareInvestments ?? true,
            allowEditExpenseBookings: parsed.allowEditExpenseBookings ?? true,
            allowDeleteTransactions: parsed.allowDeleteTransactions ?? true,
          });
        } catch (e) {
          console.error("Error parsing edit settings:", e);
          setPermissions(defaultPermissions);
        }
      }
    };

    loadPermissions();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'editSettings') {
        loadPermissions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Non-super-admins are view-only: override all edit/delete to false
  const effective: EditPermissions = isSuperAdmin
    ? permissions
    : {
        allowEditOrders: false,
        allowEditExpenses: false,
        allowEditDeposits: false,
        allowEditWithdrawals: false,
        allowEditCharging: false,
        allowEditSavings: false,
        allowEditVAT: false,
        allowEditInventory: false,
        allowEditShareInvestments: false,
        allowEditExpenseBookings: false,
        allowDeleteTransactions: false,
      };

  const canEdit = (module: keyof Omit<EditPermissions, 'allowDeleteTransactions'>) => {
    return effective[module];
  };

  const canDelete = () => {
    return effective.allowDeleteTransactions;
  };

  return {
    permissions: effective,
    isSuperAdmin,
    canEdit,
    canDelete,
    canEditOrders: effective.allowEditOrders,
    canEditExpenses: effective.allowEditExpenses,
    canEditDeposits: effective.allowEditDeposits,
    canEditWithdrawals: effective.allowEditWithdrawals,
    canEditCharging: effective.allowEditCharging,
    canEditSavings: effective.allowEditSavings,
    canEditVAT: effective.allowEditVAT,
    canEditInventory: effective.allowEditInventory,
    canEditShareInvestments: effective.allowEditShareInvestments,
    canEditExpenseBookings: effective.allowEditExpenseBookings,
    canDeleteTransactions: effective.allowDeleteTransactions,
  };
};

export default useEditPermissions;
