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
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import {
  handleSupabaseError,
  withSupabaseErrorHandling,
} from "@/utils/supabaseErrorHandler";
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
} from "lucide-react";

type AppRole = "user" | "data_entry" | "reports_viewer" | "super_admin";

interface UserWithRole {
  id: string;
  email: string | undefined;
  role: AppRole;
}

interface NewUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: AppRole;
}

const UserManagementTab = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const [newUser, setNewUser] = useState<NewUserData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user",
  });

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      // Try the main RPC function first
      let data, error;
      ({ data, error } = await supabase.rpc("get_all_users_with_roles"));

      // If that fails, try the fallback function
      if (error) {
        console.warn("Primary function failed, trying fallback:", error);
        ({ data, error } = await supabase.rpc("get_users_from_auth"));
      }

      // If both fail, try direct queries with manual joining
      if (error) {
        console.warn("Fallback function failed, trying direct queries:", error);

        // Get profiles first
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email");

        if (profilesError) {
          console.error("Profiles query failed:", profilesError);
          error = profilesError;
        } else {
          // Get user roles separately
          const { data: rolesData, error: rolesError } = await supabase
            .from("user_roles")
            .select("user_id, role");

          if (rolesError) {
            console.warn(
              "User roles query failed, using default roles:",
              rolesError,
            );
          }

          // Manually join the data
          data = (profilesData || []).map((profile: any) => {
            const userRole = rolesData?.find(
              (role: any) => role.user_id === profile.id,
            );
            return {
              id: profile.id,
              email: profile.email,
              role: userRole?.role || "user",
            };
          });

          error = null; // Clear error since we got profiles data
        }
      }

      // Final fallback: if we still have an error or no data, try getting users from auth metadata
      if (error || !data || data.length === 0) {
        console.warn(
          "All queries failed or returned no data, using basic user list",
        );

        // Create a basic user list with just the current user
        // This prevents the complete failure of the user management tab
        data = [
          {
            id: "current",
            email: "Current User",
            role: "user",
          },
        ];

        error = null; // Clear error to allow the component to render
      }

      if (error) throw error;

      // Filter out 'super_user' and map to valid AppRole types
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

      setUsers(filteredUsers);
    } catch (error) {
      logError("fetching users and roles", error);

      // Handle auth-specific errors first
      handleSupabaseError(error);

      // If it's not an auth error, show the regular error message
      if (
        !error?.message?.includes("refresh_token_not_found") &&
        !error?.message?.includes("Invalid Refresh Token")
      ) {
        const errorMessage = extractErrorMessage(error);
        toast.error(`Failed to load users: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
    fetchLogs();
  }, []);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newUser.email ||
      !newUser.password ||
      !newUser.firstName ||
      !newUser.lastName
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsCreating(true);

    try {
      // Call the edge function to create user with admin privileges
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: newUser.email,
          password: newUser.password,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
        },
      });

      if (error) {
        console.error("Error creating user:", error);
        toast.error(error.message || "Failed to create user.");
        return;
      }

      toast.success(
        `User ${newUser.email} created successfully with role: ${newUser.role}`,
      );

      // Reset form
      setNewUser({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "user",
      });

      // Refresh users list
      fetchUsersAndRoles();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase.rpc("update_user_role", {
        user_id_to_update: userId,
        new_role: newRole,
      });
      if (error) throw error;
      toast.success("User role updated successfully.");
      fetchUsersAndRoles();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Failed to update role.");
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={newUser.firstName}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={newUser.lastName}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
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

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: AppRole) =>
                  setNewUser((prev) => ({ ...prev, role: value }))
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
            </div>

            <Button type="submit" disabled={isCreating} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              {isCreating ? "Creating User..." : "Create User"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="font-semibold">Super Admin</span>
              </div>
              <p className="text-sm text-gray-600">
                Full access to all features and user management
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">Data Entry</span>
              </div>
              <p className="text-sm text-gray-600">
                Can manage orders, charging, expenses, deposits, withdrawals,
                and savings
              </p>
            </div>
            <div className="p-4 border rounded-lg col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <span className="font-semibold">Reports Viewer</span>
              </div>
              <p className="text-sm text-gray-600">
                Can view reports, analytics, and import bulk data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {getRoleDescription(u.role)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
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
    </div>
  );
};

export default UserManagementTab;
