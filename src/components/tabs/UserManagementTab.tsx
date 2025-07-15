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
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Shield,
  UserCheck,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

<<<<<<< HEAD
type AppRole = "user" | "data_entry" | "reports_viewer" | "super_admin";
=======
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Users, UserPlus, Shield, Database, BarChart3, UserCheck, Eye, EyeOff, FileText } from 'lucide-react';

type AppRole = 'user' | 'data_entry' | 'reports_viewer' | 'super_admin';
>>>>>>> origin/main

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
<<<<<<< HEAD

=======
  const [logs, setLogs] = useState<any[]>([]);
  
>>>>>>> origin/main
  const [newUser, setNewUser] = useState<NewUserData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user",
  });

  const roleOptions: { value: AppRole; label: string; description: string }[] =
    [
      { value: "user", label: "User", description: "Basic access" },
      {
        value: "data_entry",
        label: "Data Entry",
        description: "Can manage orders, expenses, and financial data",
      },
      {
        value: "reports_viewer",
        label: "Reports Viewer",
        description: "Can view reports and analytics",
      },
      {
        value: "super_admin",
        label: "Super Admin",
        description: "Full system access",
      },
    ];

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_all_users_with_roles");
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
      console.error("Error fetching users and roles:", error);
      toast.error("Failed to load users.");
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
      toast.error("Failed to load logs.");
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
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: newUser.email,
          password: newUser.password,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
        },
      });

      if (error) throw error;

      toast.success("User created successfully!");

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
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });

      if (error) throw error;

      toast.success("User role updated successfully!");
      fetchUsersAndRoles();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role.");
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Delete user role first
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (roleError) throw roleError;

      toast.success("User deleted successfully!");
      fetchUsersAndRoles();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user.");
    }
  };

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "reports_viewer":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "data_entry":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const roleCounts = users.reduce(
    (acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <Users className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">User Management</h1>
          <p className="text-gray-600">
            Manage users and their access permissions
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Users</p>
                <p className="text-2xl font-bold text-black">{users.length}</p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <Users className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Admins</p>
                <p className="text-2xl font-bold text-black">
                  {roleCounts.super_admin || 0}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <Shield className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Data Entry</p>
                <p className="text-2xl font-bold text-black">
                  {roleCounts.data_entry || 0}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <UserCheck className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Report Viewers
                </p>
                <p className="text-2xl font-bold text-black">
                  {roleCounts.reports_viewer || 0}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <Eye className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create User Form */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-3 text-black">
              <div className="p-2 bg-primary rounded-lg">
                <UserPlus className="h-5 w-5 text-black" />
              </div>
              Create New User
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-black font-medium">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, firstName: e.target.value })
                    }
                    placeholder="Enter first name"
                    required
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-black font-medium">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, lastName: e.target.value })
                    }
                    placeholder="Enter last name"
                    required
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-black font-medium">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  placeholder="Enter email address"
                  required
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-black font-medium">
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    placeholder="Enter password"
                    required
                    className="focus:ring-primary focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-black font-medium">
                  Role *
                </Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: AppRole) =>
                    setNewUser({ ...newUser, role: value })
                  }
                >
                  <SelectTrigger className="focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="Select user role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">
                            {option.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isCreating}
                className="w-full bg-primary hover:bg-brand-400 text-black"
              >
                {isCreating ? "Creating User..." : "Create User"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Role Information */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-3 text-black">
              <div className="p-2 bg-primary rounded-lg">
                <Shield className="h-5 w-5 text-black" />
              </div>
              Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {roleOptions.map((role) => (
                <div key={role.value} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-black">{role.label}</h4>
                    <Badge className={getRoleBadgeColor(role.value)}>
                      {roleCounts[role.value] || 0} users
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <Users className="h-5 w-5 text-black" />
            </div>
            All Users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                No users found
              </p>
              <p className="text-gray-500">
                Create your first user using the form above!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black">Email</TableHead>
                    <TableHead className="text-black">Current Role</TableHead>
                    <TableHead className="text-black">Change Role</TableHead>
                    <TableHead className="text-black">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell className="font-medium text-black">
                        {userItem.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(userItem.role)}>
                          {roleOptions.find((r) => r.value === userItem.role)
                            ?.label || userItem.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={userItem.role}
                          onValueChange={(newRole: AppRole) =>
                            handleRoleChange(userItem.id, newRole)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUser(userItem.id)}
                          className="hover:bg-red-50 hover:border-red-300"
                          disabled={userItem.id === user?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
