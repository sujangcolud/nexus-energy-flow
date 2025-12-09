import { useState, useEffect } from "react";

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

    // Listen for storage changes (when settings are updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'editSettings') {
        loadPermissions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const canEdit = (module: keyof Omit<EditPermissions, 'allowDeleteTransactions'>) => {
    return permissions[module];
  };

  const canDelete = () => {
    return permissions.allowDeleteTransactions;
  };

  return {
    permissions,
    canEdit,
    canDelete,
    // Convenience methods for each module
    canEditOrders: permissions.allowEditOrders,
    canEditExpenses: permissions.allowEditExpenses,
    canEditDeposits: permissions.allowEditDeposits,
    canEditWithdrawals: permissions.allowEditWithdrawals,
    canEditCharging: permissions.allowEditCharging,
    canEditSavings: permissions.allowEditSavings,
    canEditVAT: permissions.allowEditVAT,
    canEditInventory: permissions.allowEditInventory,
    canEditShareInvestments: permissions.allowEditShareInvestments,
    canEditExpenseBookings: permissions.allowEditExpenseBookings,
    canDeleteTransactions: permissions.allowDeleteTransactions,
  };
};

export default useEditPermissions;
