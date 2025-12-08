
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Users, Shield, UserPlus, Settings as SettingsIcon, Eye, EyeOff } from "lucide-react";
import { getUsersWithRolesFallback, type UserWithRole } from "@/utils/userRolesFallback";

const Settings = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("user");

  // Tab visibility settings
  const [tabSettings, setTabSettings] = useState({
    orders: true,
    expenses: true,
    deposits: true,
    withdrawals: true,
    charging: true,
    cooperative: true,
    inventory: true,
    menu: true,
    vat: true,
    fileUpload: true,
    insights: true,
    userManagement: true,
    shareInvestments: true,
    expenseBookings: true
  });

  // Transaction editing settings - all enabled by default
  const [editSettings, setEditSettings] = useState({
    allowEditOrders: true,
    allowEditExpenses: true,
    allowEditDeposits: true,
    allowEditWithdrawals: true,
    allowEditCharging: true,
    allowEditSavings: true,
    allowDeleteTransactions: true,
    requireApprovalForEdits: false,
    logAllChanges: true
  });

  // General application settings
  const [appSettings, setAppSettings] = useState({
    defaultCurrency: "NPR",
    defaultPaymentMode: "cash",
    enableNotifications: true,
    autoBackup: false,
    darkMode: false,
    compactView: false,
    showAdvancedFeatures: true
  });

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

  const loadSettings = () => {
    // Load settings from localStorage
    const savedTabSettings = localStorage.getItem('tabSettings');
    const savedEditSettings = localStorage.getItem('editSettings');
    const savedAppSettings = localStorage.getItem('appSettings');

    if (savedTabSettings) {
      setTabSettings(JSON.parse(savedTabSettings));
    }
    if (savedEditSettings) {
      setEditSettings(JSON.parse(savedEditSettings));
    } else {
      // If no settings saved yet, set canEditTransactions to true by default
      localStorage.setItem('canEditTransactions', JSON.stringify(true));
      localStorage.setItem('canAddExpenseCategory', JSON.stringify(true));
      localStorage.setItem('canAddDepositCategory', JSON.stringify(true));
      localStorage.setItem('canAddChargingCategory', JSON.stringify(true));
    }
    if (savedAppSettings) {
      setAppSettings(JSON.parse(savedAppSettings));
    }
  };

  const saveSettings = () => {
    // Save settings to localStorage
    localStorage.setItem('tabSettings', JSON.stringify(tabSettings));
    localStorage.setItem('editSettings', JSON.stringify(editSettings));
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
    
    // Save individual edit permission flags that components read
    const canEdit = editSettings.allowEditOrders || editSettings.allowEditExpenses || 
                   editSettings.allowEditDeposits || editSettings.allowEditWithdrawals || 
                   editSettings.allowEditCharging || editSettings.allowEditSavings;
    localStorage.setItem('canEditTransactions', JSON.stringify(canEdit));
    localStorage.setItem('canAddExpenseCategory', JSON.stringify(true));
    localStorage.setItem('canAddDepositCategory', JSON.stringify(true));
    localStorage.setItem('canAddChargingCategory', JSON.stringify(true));
    
    toast.success("Settings saved successfully!");
  };

  useEffect(() => {
    fetchUsers();
    loadSettings();
  }, []);

  const updateUserRole = async () => {
    if (!selectedUser || !newRole) {
      toast.error("Please select a user and role");
      return;
    }

    try {
      // Since the RPC function doesn't exist, we'll show a message
      toast.info("Role change functionality is currently unavailable. Please contact the system administrator.");
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Application Settings</h2>
      </div>

      {/* Tab Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tab Visibility Settings</CardTitle>
          <p className="text-sm text-gray-600">Control which tabs are visible in the application</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tabSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between space-x-2">
                <Label htmlFor={key} className="text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Label>
                <Switch
                  id={key}
                  checked={value}
                  onCheckedChange={(checked) => 
                    setTabSettings(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Editing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Editing Settings</CardTitle>
          <p className="text-sm text-gray-600">Configure transaction editing permissions and behavior</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(editSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between space-x-2">
                <Label htmlFor={key} className="text-sm font-medium">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Label>
                <Switch
                  id={key}
                  checked={value}
                  onCheckedChange={(checked) => 
                    setEditSettings(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* General Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <p className="text-sm text-gray-600">Configure general application behavior</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Select 
                  value={appSettings.defaultCurrency} 
                  onValueChange={(value) => setAppSettings(prev => ({ ...prev, defaultCurrency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NPR">Nepali Rupees (NPR)</SelectItem>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultPaymentMode">Default Payment Mode</Label>
                <Select 
                  value={appSettings.defaultPaymentMode} 
                  onValueChange={(value) => setAppSettings(prev => ({ ...prev, defaultPaymentMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="esewa">eSewa</SelectItem>
                    <SelectItem value="fonepay">Fonepay</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(appSettings).filter(([key]) => 
                !['defaultCurrency', 'defaultPaymentMode'].includes(key)
              ).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between space-x-2">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Label>
                  <Switch
                    id={key}
                    checked={value as boolean}
                    onCheckedChange={(checked) => 
                      setAppSettings(prev => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700">
          <SettingsIcon className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>
      </div>

      {/* User Management Section */}
      <div className="flex items-center gap-2 mt-8">
        <Users className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change User Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="role-select">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
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
          </div>
          <Button onClick={updateUserRole} className="w-full">
            <Shield className="h-4 w-4 mr-2" />
            Update Role
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
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

export default Settings;
