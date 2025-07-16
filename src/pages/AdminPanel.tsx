import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
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
  Users,
  UserCog,
  Settings,
  Eye,
  EyeOff,
  Edit,
  Plus,
  Save,
  RefreshCw,
  Shield,
  ShoppingCart,
  Zap,
  Receipt,
  CreditCard,
  Banknote,
  BarChart3,
  FileText,
  UtensilsCrossed,
  Database,
  Upload,
  LayoutDashboard,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
}

interface UserPermission {
  user_id: string;
  tab_id: string;
  enabled: boolean;
}

const AdminPanel = () => {
  const { user: currentUser, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user",
  });

  // All available tabs with their configurations
  const allTabs = [
    {
      id: "orders",
      label: "Orders",
      icon: ShoppingCart,
      defaultRoles: ["data_entry", "super_admin"],
    },
    {
      id: "charging",
      label: "Charging",
      icon: Zap,
      defaultRoles: ["data_entry", "super_admin"],
    },
    {
      id: "expenses",
      label: "Expenses",
      icon: Receipt,
      defaultRoles: ["data_entry", "super_admin"],
    },
    {
      id: "deposits",
      label: "Deposits",
      icon: CreditCard,
      defaultRoles: ["data_entry", "super_admin"],
    },
    {
      id: "withdrawals",
      label: "Withdrawals",
      icon: Banknote,
      defaultRoles: ["data_entry", "super_admin"],
    },
    {
      id: "cooperative",
      label: "Savings",
      icon: Users,
      defaultRoles: ["data_entry", "super_admin"],
    },
    {
      id: "share_investments",
      label: "Share Investments",
      icon: TrendingUp,
      defaultRoles: ["data_entry", "super_admin"],
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      defaultRoles: ["user", "data_entry", "reports_viewer", "super_admin"],
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      defaultRoles: ["reports_viewer", "super_admin"],
    },
    {
      id: "reports-view",
      label: "View Reports",
      icon: FileText,
      defaultRoles: ["user", "reports_viewer", "super_admin"],
    },
    {
      id: "insights",
      label: "Insights",
      icon: BarChart3,
      defaultRoles: ["user", "reports_viewer", "super_admin"],
    },
    {
      id: "data-input",
      label: "Bulk Import",
      icon: Upload,
      defaultRoles: ["reports_viewer", "super_admin"],
    },
    {
      id: "super_admin_dashboard",
      label: "Infographics",
      icon: LayoutDashboard,
      defaultRoles: ["super_admin"],
    },
    {
      id: "menu",
      label: "Menu Setup",
      icon: UtensilsCrossed,
      defaultRoles: ["super_admin"],
    },
    {
      id: "user_management",
      label: "User Control",
      icon: UserCog,
      defaultRoles: ["super_admin"],
    },
  ];

  // Check if current user has admin access
  if (!hasRole("super_admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              You need super admin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as User[];
    },
  });

  // Fetch user permissions
  const { data: userPermissions = [] } = useQuery({
    queryKey: ["user-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_tab_permissions")
        .select("*");

      if (error && error.code !== "42P01") throw error; // Ignore if table doesn't exist yet
      return (data as UserPermission[]) || [];
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      // First create the auth user
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      });

      if (error) throw error;

      // Create profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
      });

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: userData.role,
      });

      if (roleError) throw roleError;

      return data.user;
    },
    onSuccess: () => {
      toast.success("User created successfully!");
      setIsCreateUserOpen(false);
      setNewUserData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "user",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
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
      // First ensure the table exists
      try {
        const { error: tableError } = await supabase
          .from("user_tab_permissions")
          .select("user_id")
          .limit(1);

        if (tableError && tableError.code === "42P01") {
          // Table doesn't exist, create it
          await supabase.rpc("create_user_permissions_table");
        }
      } catch (e) {
        // Table creation might fail if it already exists, that's okay
      }

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
    onError: (error: any) => {
      toast.error(`Failed to update permission: ${error.message}`);
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").upsert({
        user_id: userId,
        role,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User role updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const getUserPermissions = (userId: string) => {
    return userPermissions.filter((perm) => perm.user_id === userId);
  };

  const isTabEnabledForUser = (userId: string, tabId: string) => {
    const permission = userPermissions.find(
      (perm) => perm.user_id === userId && perm.tab_id === tabId,
    );
    return permission ? permission.enabled : true; // Default to enabled
  };

  const handlePermissionToggle = (
    userId: string,
    tabId: string,
    enabled: boolean,
  ) => {
    updatePermissionMutation.mutate({ userId, tabId, enabled });
  };

  const handleCreateUser = () => {
    if (!newUserData.email || !newUserData.password) {
      toast.error("Email and password are required");
      return;
    }
    createUserMutation.mutate(newUserData);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">
            Manage users and their tab permissions
          </p>
        </div>

        <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
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
                    value={newUserData.firstName}
                    onChange={(e) =>
                      setNewUserData({
                        ...newUserData,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUserData.lastName}
                    onChange={(e) =>
                      setNewUserData({
                        ...newUserData,
                        lastName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) =>
                    setNewUserData({ ...newUserData, email: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) =>
                    setNewUserData({ ...newUserData, password: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUserData.role}
                  onValueChange={(value) =>
                    setNewUserData({ ...newUserData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="data_entry">Data Entry</SelectItem>
                    <SelectItem value="reports_viewer">
                      Reports Viewer
                    </SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
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

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {usersLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading users...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {user.first_name || user.last_name
                              ? `${user.first_name} ${user.last_name}`.trim()
                              : user.email}
                          </h3>
                          <Badge
                            variant={
                              user.role === "super_admin"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {user.role.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-500">
                          Created:{" "}
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Tab Permissions
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allTabs.map((tab) => {
                          const Icon = tab.icon;
                          const isEnabled = isTabEnabledForUser(
                            user.id,
                            tab.id,
                          );
                          const hasDefaultAccess = tab.defaultRoles.includes(
                            user.role,
                          );

                          return (
                            <div
                              key={tab.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isEnabled
                                  ? "bg-green-50 border-green-200"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon
                                  className={`h-4 w-4 ${isEnabled ? "text-green-600" : "text-gray-400"}`}
                                />
                                <span
                                  className={`text-sm font-medium ${isEnabled ? "text-green-800" : "text-gray-600"}`}
                                >
                                  {tab.label}
                                </span>
                                {hasDefaultAccess && (
                                  <Badge variant="outline" className="text-xs">
                                    Role Default
                                  </Badge>
                                )}
                              </div>

                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(enabled) =>
                                  handlePermissionToggle(
                                    user.id,
                                    tab.id,
                                    enabled,
                                  )
                                }
                                disabled={updatePermissionMutation.isPending}
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Super Admins</p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.role === "super_admin").length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Data Entry</p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.role === "data_entry").length}
                </p>
              </div>
              <Edit className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Regular Users</p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.role === "user").length}
                </p>
              </div>
              <UserCog className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
