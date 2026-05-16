
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Users, Shield, UserPlus } from "lucide-react";
import { getUsersWithRolesFallback, type UserWithRole } from "@/utils/userRolesFallback";
import MobileTable from "@/components/ui/mobile-table";

const UserManagementTab = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("user");

  const fetchUsers = async () => {
    try {
      const userData = await getUsersWithRolesFallback();
      setUsers(userData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async () => {
    if (!selectedUserId || !newRole) {
      toast.error("Please select a user and role");
      return;
    }

    try {
      // Since the RPC function doesn't exist, we'll show a message
      toast.info("Role change functionality is currently unavailable. Please contact the system administrator.");
    } catch (error) {
      console.error("Error changing user role:", error);
      toast.error("Failed to change user role");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'reports_viewer':
        return 'default';
      case 'data_entry':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0 pb-24 md:pb-6">
      <div className="bg-primary/5 p-4 rounded-3xl mb-4 md:mb-6 flex items-center gap-3">
        <div className="p-2 bg-primary rounded-xl text-white">
          <Users className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">User Management</h1>
      </div>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-4 md:px-6 py-4">
          <CardTitle className="text-base md:text-lg font-bold">Change User Role</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="h-11 rounded-xl">
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
          </div>
          <Button onClick={handleRoleChange} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
            <Shield className="h-5 w-5 mr-2" />
            Update Access
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-4 md:px-6 py-4">
          <CardTitle className="text-base md:text-lg font-bold">System Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MobileTable
            columns={[
              {
                key: "name",
                label: "User",
                render: (_, user) => <div className="font-bold">{user.first_name} {user.last_name}</div>,
              },
              {
                key: "email",
                label: "Email",
              },
              {
                key: "role",
                label: "Role",
                render: (val) => (
                  <Badge variant={getRoleBadgeVariant(val)}>
                    {val.replace('_', ' ').toUpperCase()}
                  </Badge>
                ),
              },
              {
                key: "created_at",
                label: "Joined",
                hideOnMobile: true,
                render: (val) => new Date(val).toLocaleDateString(),
              },
            ]}
            data={users}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementTab;
