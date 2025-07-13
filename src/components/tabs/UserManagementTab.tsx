
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
import { Users, Send, Shield, Database, BarChart3, UserCheck } from 'lucide-react';

type AppRole = 'user' | 'data_entry' | 'reports_viewer' | 'super_admin';

interface UserWithRole {
  id: string;
  email: string | undefined;
  role: AppRole;
}

const UserManagementTab = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users_with_roles');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users and roles:', error);
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error('Please enter an email address to send an invitation.');
      return;
    }
    setIsInviting(true);
    try {
      const { error } = await supabase.auth.inviteUserByEmail(inviteEmail, {
        data: { role: 'user' },
      });
      if (error) throw error;
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Failed to send invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase.rpc('update_user_role', { user_id_to_update: userId, new_role: newRole });
      if (error) throw error;
      toast.success('User role updated successfully.');
      fetchUsersAndRoles();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role.');
    }
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'super_admin':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'data_entry':
        return <Database className="h-4 w-4 text-blue-600" />;
      case 'reports_viewer':
        return <BarChart3 className="h-4 w-4 text-green-600" />;
      default:
        return <UserCheck className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleDescription = (role: AppRole) => {
    switch (role) {
      case 'super_admin':
        return 'Full access to all features and user management';
      case 'data_entry':
        return 'Can manage orders, charging, expenses, deposits, withdrawals, and savings';
      case 'reports_viewer':
        return 'Can view reports, analytics, and import bulk data';
      case 'user':
        return 'Basic user access';
      default:
        return '';
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
          <CardTitle>Invite New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteUser} className="flex items-end gap-4">
            <div className="flex-grow space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isInviting}>
              <Send className="h-4 w-4 mr-2" />
              {isInviting ? 'Sending...' : 'Send Invitation'}
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
              <p className="text-sm text-gray-600">Full access to all features and user management</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">Data Entry</span>
              </div>
              <p className="text-sm text-gray-600">Can manage orders, charging, expenses, deposits, withdrawals, and savings</p>
            </div>
            <div className="p-4 border rounded-lg col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <span className="font-semibold">Reports Viewer</span>
              </div>
              <p className="text-sm text-gray-600">Can view reports, analytics, and import bulk data</p>
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
                <TableRow><TableCell colSpan={3} className="text-center">Loading users...</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(u.role)}
                        <Select
                          value={u.role}
                          onValueChange={(newRole: AppRole) => handleRoleChange(u.id, newRole)}
                          disabled={u.id === user?.id}
                        >
                          <SelectTrigger className="w-[180px]">
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
    </div>
  );
};

export default UserManagementTab;
