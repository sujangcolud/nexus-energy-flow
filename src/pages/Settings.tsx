import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Database,
  Palette,
  Bell,
  Lock,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";

interface TabSettings {
  [key: string]: boolean;
}

const Settings = () => {
  const { user, userRole } = useAuth();
  const [tabSettings, setTabSettings] = useState<TabSettings>({});
  const [canEditTransactions, setCanEditTransactions] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedSettings = localStorage.getItem("tabSettings");
    if (storedSettings) {
      setTabSettings(JSON.parse(storedSettings));
    }

    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, []);

  const handleTabToggle = (tabId: string, enabled: boolean) => {
    const newSettings = { ...tabSettings, [tabId]: enabled };
    setTabSettings(newSettings);
    localStorage.setItem("tabSettings", JSON.stringify(newSettings));
    toast.success(`${tabId} tab ${enabled ? "enabled" : "disabled"}`);
  };

  const handleEditTransactionsToggle = (enabled: boolean) => {
    setCanEditTransactions(enabled);
    localStorage.setItem("canEditTransactions", JSON.stringify(enabled));
    toast.success(`Transaction editing ${enabled ? "enabled" : "disabled"}`);
  };

  const resetToDefaults = () => {
    const defaultSettings = {
      orders: true,
      charging: true,
      expenses: true,
      deposits: true,
      withdrawals: true,
      cooperative: true,
      reports: true,
      insights: true,
      menu: true,
      user_management: true,
    };
    setTabSettings(defaultSettings);
    setCanEditTransactions(false);
    localStorage.setItem("tabSettings", JSON.stringify(defaultSettings));
    localStorage.setItem("canEditTransactions", JSON.stringify(false));
    toast.success("Settings reset to defaults");
  };

  const tabDefinitions = [
    {
      id: "orders",
      label: "Orders",
      description: "Manage food orders and transactions",
      icon: "🛒",
    },
    {
      id: "charging",
      label: "Charging",
      description: "Track energy consumption and sessions",
      icon: "⚡",
    },
    {
      id: "expenses",
      label: "Expenses",
      description: "Monitor business expenses and costs",
      icon: "📋",
    },
    {
      id: "deposits",
      label: "Deposits",
      description: "Handle financial deposits",
      icon: "💳",
    },
    {
      id: "withdrawals",
      label: "Withdrawals",
      description: "Process withdrawals and payments",
      icon: "💸",
    },
    {
      id: "cooperative",
      label: "Savings",
      description: "Cooperative savings management",
      icon: "👥",
    },
    {
      id: "reports",
      label: "Reports",
      description: "Generate comprehensive business reports",
      icon: "📄",
    },
    {
      id: "insights",
      label: "Analytics",
      description: "Business analytics and insights",
      icon: "📊",
    },
    {
      id: "menu",
      label: "Menu Setup",
      description: "Manage menu items and categories",
      icon: "🍽️",
    },
    {
      id: "user_management",
      label: "User Control",
      description: "Manage users and permissions",
      icon: "👤",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <SettingsIcon className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Settings</h1>
          <p className="text-gray-600">
            Customize your dashboard experience and preferences
          </p>
        </div>
      </div>

      {/* User Profile */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <User className="h-5 w-5 text-black" />
            </div>
            User Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-black">Email</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-gray-50 border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-black">Name</Label>
                <Input
                  value={user?.name || "User"}
                  disabled
                  className="bg-gray-50 border-gray-200"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-black">Role</Label>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-primary text-primary"
                  >
                    {userRole || "user"}
                  </Badge>
                  <Shield className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-black">User ID</Label>
                <Input
                  value={user?.id || ""}
                  disabled
                  className="bg-gray-50 border-gray-200 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Settings */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <Edit3 className="h-5 w-5 text-black" />
            </div>
            Transaction Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-black font-medium">
                  Enable Transaction Editing
                </Label>
                <p className="text-sm text-gray-600">
                  Allow editing and deleting of existing transactions across all
                  tabs
                </p>
              </div>
              <Switch
                checked={canEditTransactions}
                onCheckedChange={handleEditTransactionsToggle}
              />
            </div>
            {canEditTransactions && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-700">
                    Transaction editing is enabled. Use with caution to maintain
                    data integrity.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab Visibility */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <Palette className="h-5 w-5 text-black" />
            </div>
            Tab Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tabDefinitions.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tab.icon}</span>
                  <div>
                    <p className="font-medium text-black">{tab.label}</p>
                    <p className="text-sm text-gray-600">{tab.description}</p>
                  </div>
                </div>
                <Switch
                  checked={tabSettings[tab.id] !== false}
                  onCheckedChange={(enabled) =>
                    handleTabToggle(tab.id, enabled)
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <Database className="h-5 w-5 text-black" />
            </div>
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-600 mb-1">Authentication</p>
              <p className="font-bold text-black">Supabase</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Database className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm text-gray-600 mb-1">Database</p>
              <p className="font-bold text-black">PostgreSQL</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Bell className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-sm text-gray-600 mb-1">Notifications</p>
              <p className="font-bold text-black">Enabled</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-black">Reset Settings</h3>
              <p className="text-sm text-gray-600">
                Reset all customizations to default values
              </p>
            </div>
            <Button
              onClick={resetToDefaults}
              variant="outline"
              className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
