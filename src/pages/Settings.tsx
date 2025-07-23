import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Settings as SettingsIcon,
  Palette,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  RotateCcw,
  Users,
  UserPlus,
  Shield,
  Database,
  BarChart3,
  UserCheck,
  FileText,
  Plus,
  RefreshCw,
  Edit,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import HistoricalDataFixAdmin from "@/components/HistoricalDataFixAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fixAdminRole } from "@/utils/emergencyAdminFix";

type AppRole = "user" | "data_entry" | "reports_viewer" | "super_admin";

interface UserWithRole {
  id: string;
  email: string | undefined;
  role: AppRole;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

interface NewUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AppRole;
}

interface UserPermission {
  user_id: string;
  tab_id: string;
  enabled: boolean;
}

const allItems = [
  {
    id: "orders",
    label: "Orders",
    icon: "🛒",
    description: "Manage food orders and transactions",
    defaultRoles: ["data_entry", "super_admin"] as AppRole[],
  },
  {
    id: "charging",
    label: "Charging",
    icon: "⚡",
    description: "Track energy consumption and billing",
    defaultRoles: ["data_entry", "super_admin"] as AppRole[],
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: "📄",
    description: "Monitor business expenses",
    defaultRoles: ["data_entry", "super_admin"] as AppRole[],
  },
  {
    id: "deposits",
    label: "Deposits",
    icon: "💳",
    description: "Handle financial deposits",
    defaultRoles: ["data_entry", "super_admin"] as AppRole[],
  },
  {
    id: "withdrawals",
    label: "Withdrawals",
    icon: "💵",
    description: "Process withdrawals and payouts",
    defaultRoles: ["data_entry", "super_admin"] as AppRole[],
  },
  {
    id: "cooperative",
    label: "Savings",
    icon: "👥",
    description: "Cooperative savings management",
    defaultRoles: ["data_entry", "super_admin"] as AppRole[],
  },

  {
    id: "data-input",
    label: "Bulk Data Import",
    icon: "📤",
    description: "Import data in bulk",
    defaultRoles: ["reports_viewer", "super_admin"] as AppRole[],
  },
  {
    id: "super_admin_dashboard",
    label: "Admin Dashboard",
    icon: "🔧",
    description: "Administrator control panel",
    defaultRoles: ["super_admin"] as AppRole[],
  },
  {
    id: "menu",
    label: "Menu Management",
    icon: "🍽️",
    description: "Manage menu items and pricing",
    defaultRoles: ["super_admin"] as AppRole[],
  },
  {
    id: "share_investments",
    label: "Share Investments",
    icon: "📈",
    description: "Manage share investments",
    defaultRoles: ["data_entry", "super_admin"] as AppRole[],
  },
  {
    id: "file_upload",
    label: "File Upload",
    icon: "📤",
    description: "Upload files to the system",
    defaultRoles: ["super_admin"] as AppRole[],
  },
];

const Settings = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [tabSettings, setTabSettings] = useState<Record<string, boolean>>({});
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [canEditTransactions, setCanEditTransactions] = useState(false);
  const [canAddChargingCategory, setCanAddChargingCategory] = useState(false);
  const [canAddSavingsCategory, setCanAddSavingsCategory] = useState(false);
  const [canAddWithdrawalCategory, setCanAddWithdrawalCategory] =
    useState(false);
  const [canAddDepositCategory, setCanAddDepositCategory] = useState(false);
  const [canAddExpenseBookingCategory, setCanAddExpenseBookingCategory] =
    useState(false);
  const [canAddMenuCategory, setCanAddMenuCategory] = useState(false);
  const [canAddExpenseCategory, setCanAddExpenseCategory] = useState(false);
  const [canDeleteTabs, setCanDeleteTabs] = useState(false);
  const [showBatchClosing, setShowBatchClosing] = useState(false);
  const [showOrders, setShowOrders] = useState(true);

  const [showDataInput, setShowDataInput] = useState(true);
  const [showUserManagement, setShowUserManagement] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(true);
  const [showShareInvestments, setShowShareInvestments] = useState(true);
  const [showVatEntry, setShowVatEntry] = useState(true);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isFixingRole, setIsFixingRole] = useState(false);
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      user_id: string;
      action: string;
      table_name: string;
      record_id: string;
      created_at: string;
    }>
  >([]);
  const [newUser, setNewUser] = useState<NewUserData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user",
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_users_with_roles");
      if (error) {
        // Handle specific schema errors gracefully
        if (
          error.code === "42703" ||
          error.message?.includes("ur.role") ||
          error.message?.includes("column") ||
          error.message?.includes("does not exist")
        ) {
          console.warn(
            "User roles schema issue detected in Settings, returning empty array:",
            error,
          );
          // Return empty array instead of throwing error
          return [] as UserWithRole[];
        }
        throw error;
      }

      const filteredUsers = (data || [])
        .map((user) => ({
          ...user,
          role:
            user.role === "super_user"
              ? ("super_admin" as AppRole)
              : (user.role as AppRole),
        }))
        .filter((user) =>
          ["user", "data_entry", "reports_viewer", "super_admin"].includes(
            user.role,
          ),
        );

      return filteredUsers as UserWithRole[];
    },
    enabled: hasRole("super_admin"),
  });

  // Fetch user permissions
  const { data: userPermissions = [] } = useQuery({
    queryKey: ["user-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_tab_permissions")
        .select("*");

      if (error && error.code !== "42P01") throw error;
      return (data as UserPermission[]) || [];
    },
    enabled: hasRole("super_admin"),
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("User created successfully!");
      setShowCreateUserForm(false);
      setNewUser({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "user",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`);
    },
  });

  // Update user permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      userId,
      tabId,
      enabled,
    }: {
      userId: string;
      tabId: string;
      enabled: boolean;
    }) => {
      const { error } = await supabase.from("user_tab_permissions").upsert({
        user_id: userId,
        tab_id: tabId,
        enabled,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permission: ${error.message}`);
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.rpc("update_user_role", {
        user_id_to_update: userId,
        new_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User role updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem("tabSettings");
    if (storedSettings) {
      setTabSettings(JSON.parse(storedSettings));
    } else {
      const defaultSettings = allItems.reduce(
        (acc, item) => {
          acc[item.id] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );
      setTabSettings(defaultSettings);
    }

    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }

    const batchClosingSetting = localStorage.getItem("showBatchClosing");
    if (batchClosingSetting !== null) {
      setShowBatchClosing(JSON.parse(batchClosingSetting));
    }

    const canAddCharging = localStorage.getItem("canAddChargingCategory");
    if (canAddCharging) {
      setCanAddChargingCategory(JSON.parse(canAddCharging));
    }

    const canAddSavings = localStorage.getItem("canAddSavingsCategory");
    if (canAddSavings) {
      setCanAddSavingsCategory(JSON.parse(canAddSavings));
    }

    const canAddWithdrawal = localStorage.getItem("canAddWithdrawalCategory");
    if (canAddWithdrawal) {
      setCanAddWithdrawalCategory(JSON.parse(canAddWithdrawal));
    }

    const canAddDeposit = localStorage.getItem("canAddDepositCategory");
    if (canAddDeposit) {
      setCanAddDepositCategory(JSON.parse(canAddDeposit));
    }

    const canAddExpenseBooking = localStorage.getItem(
      "canAddExpenseBookingCategory",
    );
    if (canAddExpenseBooking) {
      setCanAddExpenseBookingCategory(JSON.parse(canAddExpenseBooking));
    }

    const canAddMenu = localStorage.getItem("canAddMenuCategory");
    if (canAddMenu) {
      setCanAddMenuCategory(JSON.parse(canAddMenu));
    }

    const canAddExpense = localStorage.getItem("canAddExpenseCategory");
    if (canAddExpense) {
      setCanAddExpenseCategory(JSON.parse(canAddExpense));
    }

    const canDelete = localStorage.getItem("canDeleteTabs");
    if (canDelete) {
      setCanDeleteTabs(JSON.parse(canDelete));
    }

    const orders = localStorage.getItem("showOrders");
    if (orders) {
      setShowOrders(JSON.parse(orders));
    }

    const dataInput = localStorage.getItem("showDataInput");
    if (dataInput) {
      setShowDataInput(JSON.parse(dataInput));
    }

    const userManagement = localStorage.getItem("showUserManagement");
    if (userManagement) {
      setShowUserManagement(JSON.parse(userManagement));
    }

    const adminPanel = localStorage.getItem("showAdminPanel");
    if (adminPanel) {
      setShowAdminPanel(JSON.parse(adminPanel));
    }

    const shareInvestments = localStorage.getItem("showShareInvestments");
    if (shareInvestments) {
      setShowShareInvestments(JSON.parse(shareInvestments));
    }

    const vatEntry = localStorage.getItem("showVatEntry");
    if (vatEntry) {
      setShowVatEntry(JSON.parse(vatEntry));
    }

    // Fetch logs if admin
    if (hasRole("super_admin")) {
      fetchLogs();
    }
  }, [hasRole]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);

      let errorMessage = "Failed to load logs";
      if (error && typeof error === "object") {
        const msg = error.message || error["message"] || null;
        const details = error.details || error["details"] || null;
        const hint = error.hint || error["hint"] || null;
        const code = error.code || error["code"] || null;

        if (msg && typeof msg === "string" && msg.trim() !== "") {
          errorMessage = msg;
        } else if (
          details &&
          typeof details === "string" &&
          details.trim() !== ""
        ) {
          errorMessage = details;
        } else if (hint && typeof hint === "string" && hint.trim() !== "") {
          errorMessage = hint;
        } else if (code && typeof code === "string" && code.trim() !== "") {
          if (code === "42P01") {
            errorMessage =
              "Logs table does not exist. Please run the database migration.";
          } else if (code === "42501") {
            errorMessage =
              "Permission denied. Please check your database permissions.";
          } else if (code === "PGRST204") {
            errorMessage =
              "Database schema error. Please refresh the page or run migrations.";
          } else {
            errorMessage = `Database error (${code})`;
          }
        } else {
          try {
            errorMessage = JSON.stringify(error, null, 2);
          } catch (e) {
            errorMessage = `Error object could not be serialized: ${String(error)}`;
          }
        }
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast.error(`Error fetching logs: ${errorMessage}`);
    }
  };

  const handleToggle = (tabId: string) => {
    if (user && hasRole("super_admin")) {
      const currentSetting = tabSettings[tabId] ?? true;
      const newSettings = { ...tabSettings, [tabId]: !currentSetting };
      setTabSettings(newSettings);
      localStorage.setItem("tabSettings", JSON.stringify(newSettings));
      updatePermissionMutation.mutate({
        userId: user.id,
        tabId,
        enabled: !currentSetting,
      });
    }
  };

  const handleCreateUser = () => {
    if (
      !newUser.email ||
      !newUser.password ||
      !newUser.firstName ||
      !newUser.lastName
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser((prev) => ({ ...prev, password }));
  };

  const handleFixAdminRole = async () => {
    setIsFixingRole(true);
    try {
      const result = await fixAdminRole();
      if (result.success) {
        toast.success(result.message);
        // Refresh the page to see role changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`Failed to fix admin role: ${error.message}`);
    } finally {
      setIsFixingRole(false);
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case "super_admin":
        return <Shield className="h-4 w-4 text-purple-600" />;
      case "data_entry":
        return <Database className="h-4 w-4 text-blue-600" />;
      case "reports_viewer":
        return <BarChart3 className="h-4 w-4 text-green-600" />;
      default:
        return <UserCheck className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleDescription = (role: AppRole) => {
    switch (role) {
      case "super_admin":
        return "Full access to all features and user management";
      case "data_entry":
        return "Can manage orders, charging, expenses, deposits, withdrawals, and savings";
      case "reports_viewer":
        return "Can view reports, analytics, and import bulk data";
      case "user":
        return "Basic user access";
      default:
        return "";
    }
  };

  const isTabEnabledForUser = (userId: string, tabId: string) => {
    const permission = userPermissions.find(
      (perm) => perm.user_id === userId && perm.tab_id === tabId,
    );
    return permission ? permission.enabled : true;
  };

  const handlePermissionToggle = (
    userId: string,
    tabId: string,
    enabled: boolean,
  ) => {
    updatePermissionMutation.mutate({ userId, tabId, enabled });
  };

  useEffect(() => {
    localStorage.setItem(
      "canEditTransactions",
      JSON.stringify(canEditTransactions),
    );
    localStorage.setItem("showBatchClosing", JSON.stringify(showBatchClosing));
    localStorage.setItem(
      "canAddChargingCategory",
      JSON.stringify(canAddChargingCategory),
    );
    localStorage.setItem(
      "canAddSavingsCategory",
      JSON.stringify(canAddSavingsCategory),
    );
    localStorage.setItem(
      "canAddWithdrawalCategory",
      JSON.stringify(canAddWithdrawalCategory),
    );
    localStorage.setItem(
      "canAddDepositCategory",
      JSON.stringify(canAddDepositCategory),
    );
    localStorage.setItem(
      "canAddExpenseBookingCategory",
      JSON.stringify(canAddExpenseBookingCategory),
    );
    localStorage.setItem(
      "canAddMenuCategory",
      JSON.stringify(canAddMenuCategory),
    );
    localStorage.setItem(
      "canAddExpenseCategory",
      JSON.stringify(canAddExpenseCategory),
    );
    localStorage.setItem("showOrders", JSON.stringify(showOrders));

    localStorage.setItem("showDataInput", JSON.stringify(showDataInput));
    localStorage.setItem(
      "showUserManagement",
      JSON.stringify(showUserManagement),
    );
    localStorage.setItem("showAdminPanel", JSON.stringify(showAdminPanel));
    localStorage.setItem(
      "showShareInvestments",
      JSON.stringify(showShareInvestments),
    );
    localStorage.setItem("showVatEntry", JSON.stringify(showVatEntry));
    localStorage.setItem("canDeleteTabs", JSON.stringify(canDeleteTabs));
  }, [
    canEditTransactions,
    canDeleteTabs,
    showBatchClosing,
    canAddChargingCategory,
    canAddSavingsCategory,
    canAddWithdrawalCategory,
    canAddDepositCategory,
    canAddExpenseBookingCategory,
    canAddMenuCategory,
    canAddExpenseCategory,
    showOrders,

    showDataInput,
    showUserManagement,
    showAdminPanel,
    showShareInvestments,
    showVatEntry,
  ]);

  const handleResetSettings = () => {
    const defaultSettings = allItems.reduce(
      (acc, item) => {
        acc[item.id] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );
    setTabSettings(defaultSettings);
    localStorage.setItem("tabSettings", JSON.stringify(defaultSettings));
  };

  const enabledCount = Object.values(tabSettings).filter(Boolean).length;
  const totalCount = allItems.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-pink-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-emerald-400/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
              <SettingsIcon className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              Settings & Preferences
            </h1>
            <Sparkles className="h-8 w-8 text-yellow-500 animate-pulse" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Customize your dashboard experience and manage your account settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
                  {user?.name?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>
                <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {user?.name || "User Profile"}
                </CardTitle>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Role:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user?.role === 'super_admin'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {user?.role}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Emergency Admin Fix - only show for sujan1nepal@gmail.com if not super_admin */}
                {user?.email === "sujan1nepal@gmail.com" && user?.role !== "super_admin" && (
                  <div className="text-center mb-4">
                    <Button
                      onClick={handleFixAdminRole}
                      disabled={isFixingRole}
                      className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white transition-all duration-200 transform hover:scale-105"
                    >
                      {isFixingRole ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Fixing Admin Role...
                        </>
                      ) : (
                        <>
                          <UserCog className="h-4 w-4 mr-2" />
                          Fix My Admin Role
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-orange-600 mt-2">
                      Your account should be super admin. Click to fix this issue.
                    </p>
                  </div>
                )}

                <div className="text-center">
                  <Button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white transition-all duration-200 transform hover:scale-105"
                  >
                    {showPasswordForm ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Password Form
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>

                {showPasswordForm && (
                  <div className="mt-6">
                    <PasswordChangeForm />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dashboard Customization */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      <Palette className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Dashboard Modules
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Toggle modules to show/hide on your dashboard
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {enabledCount}/{totalCount}
                    </div>
                    <p className="text-xs text-gray-500">Enabled</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {allItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        tabSettings[item.id]
                          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg"
                          : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 shadow-sm opacity-60"
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <Label
                              htmlFor={item.id}
                              className={`font-medium cursor-pointer ${
                                tabSettings[item.id]
                                  ? "text-gray-800"
                                  : "text-gray-500"
                              }`}
                            >
                              {item.label}
                            </Label>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id={item.id}
                          checked={tabSettings[item.id] ?? true}
                          onCheckedChange={() => handleToggle(item.id)}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-emerald-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handleResetSettings}
                    variant="outline"
                    className="flex items-center gap-2 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:border-orange-300 transition-all duration-200 transform hover:scale-105"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Defaults
                  </Button>

                  <Button className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200 transform hover:scale-105">
                    <Save className="h-4 w-4" />
                    Settings Saved
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* User Management Section - Only visible to super admin */}
        {hasRole("super_admin") && (
          <>
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <Dialog
                    open={showCreateUserForm}
                    onOpenChange={setShowCreateUserForm}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                          Add a new user to the system with specified role and
                          permissions.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              value={newUser.firstName}
                              onChange={(e) =>
                                setNewUser({
                                  ...newUser,
                                  firstName: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={newUser.lastName}
                              onChange={(e) =>
                                setNewUser({
                                  ...newUser,
                                  lastName: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) =>
                              setNewUser({ ...newUser, email: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">Password</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-grow">
                              <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={newUser.password}
                                onChange={(e) =>
                                  setNewUser({
                                    ...newUser,
                                    password: e.target.value,
                                  })
                                }
                                required
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={generatePassword}
                            >
                              Generate
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="role">Role</Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value: AppRole) =>
                              setNewUser({ ...newUser, role: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="data_entry">
                                Data Entry
                              </SelectItem>
                              <SelectItem value="reports_viewer">
                                Reports Viewer
                              </SelectItem>
                              <SelectItem value="super_admin">
                                Super Admin
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleCreateUser}
                          disabled={createUserMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {createUserMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Create User
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading users...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users?.map((u) => (
                      <Card key={u.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold">
                                  {u.first_name || u.last_name
                                    ? `${u.first_name} ${u.last_name}`.trim()
                                    : u.email}
                                </h3>
                                <div className="flex items-center gap-2">
                                  {getRoleIcon(u.role)}
                                  <Select
                                    value={u.role}
                                    onValueChange={(newRole: AppRole) =>
                                      handleRoleChange(u.id, newRole)
                                    }
                                    disabled={u.id === user?.id}
                                  >
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="data_entry">
                                        Data Entry
                                      </SelectItem>
                                      <SelectItem value="reports_viewer">
                                        Reports Viewer
                                      </SelectItem>
                                      <SelectItem value="super_admin">
                                        Super Admin
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <p className="text-gray-600">{u.email}</p>
                              <p className="text-sm text-gray-500">
                                Created:{" "}
                                {new Date(u.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {getRoleDescription(u.role)}
                              </p>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                              <SettingsIcon className="h-4 w-4" />
                              Module Permissions
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {allItems.map((item) => {
                                const isEnabled = isTabEnabledForUser(
                                  u.id,
                                  item.id,
                                );
                                const hasDefaultAccess =
                                  item.defaultRoles.includes(u.role);

                                return (
                                  <div
                                    key={item.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${
                                      isEnabled
                                        ? "bg-green-50 border-green-200"
                                        : "bg-gray-50 border-gray-200"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-xl ${isEnabled ? "" : "opacity-50"}`}
                                      >
                                        {item.icon}
                                      </span>
                                      <div>
                                        <span
                                          className={`text-sm font-medium ${isEnabled ? "text-green-800" : "text-gray-600"}`}
                                        >
                                          {item.label}
                                        </span>
                                        {hasDefaultAccess && (
                                          <div className="text-xs text-blue-600">
                                            Role Default
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={(enabled) =>
                                        handlePermissionToggle(
                                          u.id,
                                          item.id,
                                          enabled,
                                        )
                                      }
                                      disabled={
                                        updatePermissionMutation.isPending
                                      }
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Logs */}
            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Activity Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Record ID</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.user_id}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.table_name}</TableCell>
                        <TableCell>{log.record_id}</TableCell>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle>Transaction Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-transactions">
                Enable Transaction Editing
              </Label>
              <Switch
                id="edit-transactions"
                checked={canEditTransactions}
                onCheckedChange={setCanEditTransactions}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="add-charging-category">
                Enable Add Charging Category
              </Label>
              <Switch
                id="add-charging-category"
                checked={canAddChargingCategory}
                onCheckedChange={setCanAddChargingCategory}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="add-savings-category">
                Enable Add Savings Category
              </Label>
              <Switch
                id="add-savings-category"
                checked={canAddSavingsCategory}
                onCheckedChange={setCanAddSavingsCategory}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="add-withdrawal-category">
                Enable Add Withdrawal Category
              </Label>
              <Switch
                id="add-withdrawal-category"
                checked={canAddWithdrawalCategory}
                onCheckedChange={setCanAddWithdrawalCategory}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="add-deposit-category">
                Enable Add Deposit Category
              </Label>
              <Switch
                id="add-deposit-category"
                checked={canAddDepositCategory}
                onCheckedChange={setCanAddDepositCategory}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="add-expense-booking-category">
                Enable Add Expense Booking Category
              </Label>
              <Switch
                id="add-expense-booking-category"
                checked={canAddExpenseBookingCategory}
                onCheckedChange={setCanAddExpenseBookingCategory}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="add-menu-category">
                Enable Add Menu Category
              </Label>
              <Switch
                id="add-menu-category"
                checked={canAddMenuCategory}
                onCheckedChange={setCanAddMenuCategory}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="add-expense-category">
                Enable Add Expense Category
              </Label>
              <Switch
                id="add-expense-category"
                checked={canAddExpenseCategory}
                onCheckedChange={setCanAddExpenseCategory}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="delete-tabs">Enable Tab Deletion</Label>
              <Switch
                id="delete-tabs"
                checked={canDeleteTabs}
                onCheckedChange={setCanDeleteTabs}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-batch-closing">
                Show Batch Closing Button
              </Label>
              <Switch
                id="show-batch-closing"
                checked={showBatchClosing}
                onCheckedChange={setShowBatchClosing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Historical Data Fix - Only visible to super admin */}
        {hasRole("super_admin") && (
          <div className="mt-8">
            <HistoricalDataFixAdmin />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">
                    Active Modules
                  </p>
                  <p className="text-2xl font-bold text-orange-800">
                    {enabledCount}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white">
                  <Eye className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Total Available
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    {totalCount}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <SettingsIcon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Customization
                  </p>
                  <p className="text-2xl font-bold text-purple-800">
                    {Math.round((enabledCount / totalCount) * 100)}%
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                  <Palette className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
