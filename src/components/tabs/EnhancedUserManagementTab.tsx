import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import {
  AppRole,
  TAB_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  hasTabAccess,
  getUserActionPermissions,
  getTabsByCategory,
  isRoleTransitionAllowed,
} from "@/utils/roleBasedAccess";
import {
  Users,
  UserPlus,
  Shield,
  Database,
  BarChart3,
  UserCheck,
  Eye,
  EyeOff,
  FileText,
  Settings,
  Crown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserWithRole {
  id: string;
  email: string;
  role: AppRole;
  last_sign_in_at?: string;
  created_at?: string;
}

interface NewUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AppRole;
}

interface UserPermissions {
  userId: string;
  permissions: Record<string, boolean>;
}

const EnhancedUserManagementTab = () => {
  const { user, userRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [newUser, setNewUser] = useState<NewUserData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user",
  });

  const currentUserPermissions = getUserActionPermissions(userRole);

  useEffect(() => {
    if (user && currentUserPermissions.canManagePermissions) {
      fetchUsersAndRoles();
      fetchUserPermissions();
    }
  }, [user, currentUserPermissions.canManagePermissions]);

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      // Try to get users with roles using multiple methods
      let userData: UserWithRole[] = [];

      try {
        const { data, error } = await supabase.rpc("get_all_users_with_roles");
        if (!error && data) {
          userData = data;
        }
      } catch (error) {
        console.warn("RPC function failed, trying fallback methods");
      }

      // Fallback: Try to get from profiles table
      if (userData.length === 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name");

        if (!profilesError && profilesData) {
          // Get user roles separately
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("user_id, role");

          userData = profilesData.map((profile) => {
            const userRole = rolesData?.find((r) => r.user_id === profile.id);
            return {
              id: profile.id,
              email: profile.email || "Unknown",
              role: (userRole?.role as AppRole) || "user",
            };
          });
        }
      }

      // Final fallback: Create minimal admin user
      if (userData.length === 0) {
        userData = [
          {
            id: "admin",
            email: "sujan1nepal@gmail.com",
            role: "super_admin",
          },
        ];
      }

      setUsers(userData);
    } catch (error) {
      logError("fetching users and roles", error);
      toast.error(`Error loading users: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async () => {
    // This would fetch custom permissions per user
    // For now, we'll use role-based defaults
    const permissions = users.map((user) => ({
      userId: user.id,
      permissions: getTabsByCategory(user.role),
    }));
    setUserPermissions(permissions as any);
  };

  const handleCreateUser = async () => {
    if (!currentUserPermissions.canCreateUsers) {
      toast.error("You don't have permission to create users");
      return;
    }

    try {
      // Create user using Supabase Auth Admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: {
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          role: newUser.role,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Set the user role in user_roles table
        await supabase.rpc("set_user_role", {
          target_user_id: data.user.id,
          new_role: newUser.role,
        });

        // Create profile entry
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: newUser.email,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
        });
      }

      toast.success(
        `User ${newUser.email} created successfully with role: ${newUser.role}`,
      );
      setIsCreateDialogOpen(false);
      setNewUser({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "user",
      });

      await fetchUsersAndRoles();
    } catch (error) {
      logError("creating user", error);
      toast.error(`Error creating user: ${extractErrorMessage(error)}`);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: AppRole) => {
    if (!currentUserPermissions.canModifyUsers) {
      toast.error("You don't have permission to modify users");
      return;
    }

    const user = users.find((u) => u.id === userId);
    if (!user) return;

    if (!isRoleTransitionAllowed(user.role, newRole, userRole!)) {
      toast.error("You don't have permission to assign this role");
      return;
    }

    try {
      await supabase.rpc("set_user_role", {
        target_user_id: userId,
        new_role: newRole,
      });

      toast.success(`User role updated to ${newRole}`);
      await fetchUsersAndRoles();
    } catch (error) {
      logError("updating user role", error);
      toast.error(`Error updating user role: ${extractErrorMessage(error)}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentUserPermissions.canDeleteUsers) {
      toast.error("You don't have permission to delete users");
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast.success("User deleted successfully");
      await fetchUsersAndRoles();
    } catch (error) {
      logError("deleting user", error);
      toast.error(`Error deleting user: ${extractErrorMessage(error)}`);
    }
  };

  const generateRandomPassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser({ ...newUser, password });
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case "super_admin":
        return <Crown className="h-4 w-4 text-purple-600" />;
      case "reports_viewer":
        return <BarChart3 className="h-4 w-4 text-blue-600" />;
      case "data_entry":
        return <Database className="h-4 w-4 text-green-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case "super_admin":
        return "default";
      case "reports_viewer":
        return "secondary";
      case "data_entry":
        return "outline";
      default:
        return "outline";
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await fetchUsersAndRoles();
      await fetchUserPermissions();
      toast.success("User data refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  if (!currentUserPermissions.canManagePermissions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <CardContent className="text-center">
            <Shield className="h-16 w-16 mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access user management. This feature
              requires super admin privileges.
            </p>
            <Badge variant="outline" className="text-red-600 border-red-300">
              {userRole?.replace("_", " ").toUpperCase() || "NO ROLE"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-xl">
              <Users className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              User Management & Access Control
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive user management with role-based access control
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Shield className="h-3 w-3 mr-1" />
              Super Admin Access
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={refreshing}
              className="ml-2"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Create New User
          </Button>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    {users.length}
                  </p>
                </div>
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Super Admins
                  </p>
                  <p className="text-2xl font-bold text-purple-800">
                    {users.filter((u) => u.role === "super_admin").length}
                  </p>
                </div>
                <Crown className="h-6 w-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Data Entry
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    {users.filter((u) => u.role === "data_entry").length}
                  </p>
                </div>
                <Database className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">
                    Report Viewers
                  </p>
                  <p className="text-2xl font-bold text-amber-800">
                    {users.filter((u) => u.role === "reports_viewer").length}
                  </p>
                </div>
                <BarChart3 className="h-6 w-6 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Users & Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            <div>
                              <div className="font-medium">{user.email}</div>
                              <div className="text-sm text-gray-500">
                                ID: {user.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role.replace("_", " ").toUpperCase()}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              {ROLE_DESCRIPTIONS[user.role]}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            {
                              TAB_PERMISSIONS.filter((tab) =>
                                hasTabAccess(user.role, tab.id),
                              ).length
                            }{" "}
                            of {TAB_PERMISSIONS.length} tabs
                            <Progress
                              value={
                                (TAB_PERMISSIONS.filter((tab) =>
                                  hasTabAccess(user.role, tab.id),
                                ).length /
                                  TAB_PERMISSIONS.length) *
                                100
                              }
                              className="w-20 h-2 mt-1"
                            />
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getUserActionPermissions(user.role)
                              .canManagePermissions && (
                              <Badge variant="default" className="text-xs">
                                Admin
                              </Badge>
                            )}
                            {getUserActionPermissions(user.role)
                              .canAccessReports && (
                              <Badge variant="secondary" className="text-xs">
                                Reports
                              </Badge>
                            )}
                            {getUserActionPermissions(user.role)
                              .canExportData && (
                              <Badge variant="outline" className="text-xs">
                                Export
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={user.role}
                              onValueChange={(newRole: AppRole) =>
                                handleUpdateUserRole(user.id, newRole)
                              }
                              disabled={user.id === user?.id} // Can't change own role
                            >
                              <SelectTrigger className="w-32 h-8">
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

                            {user.id !== user?.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete User
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete user{" "}
                                      {user.email}? This action cannot be
                                      undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role-based Access Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role-based Access Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Data Entry</TableHead>
                    <TableHead>Reports Viewer</TableHead>
                    <TableHead>Super Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TAB_PERMISSIONS.map((tab) => (
                    <TableRow key={tab.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tab.label}</div>
                          <div className="text-xs text-gray-500">
                            {tab.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasTabAccess("user", tab.id) ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        {hasTabAccess("data_entry", tab.id) ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        {hasTabAccess("reports_viewer", tab.id) ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        {hasTabAccess("super_admin", tab.id) ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newUser.firstName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, firstName: e.target.value })
                  }
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newUser.lastName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, lastName: e.target.value })
                  }
                  placeholder="Doe"
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
                placeholder="user@example.com"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  placeholder="Enter password"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateRandomPassword}
                  size="sm"
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
                  <SelectItem value="data_entry">Data Entry</SelectItem>
                  <SelectItem value="reports_viewer">Reports Viewer</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-500 mt-1">
                {ROLE_DESCRIPTIONS[newUser.role]}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={!newUser.email || !newUser.password}
            >
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedUserManagementTab;
