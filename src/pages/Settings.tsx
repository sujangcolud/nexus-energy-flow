import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PasswordChangeForm from "@/components/PasswordChangeForm";

const allItems = [
  {
    id: "orders",
    label: "Orders",
    icon: "🛒",
    description: "Manage food orders and transactions",
  },
  {
    id: "charging",
    label: "Charging",
    icon: "⚡",
    description: "Track energy consumption and billing",
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: "📄",
    description: "Monitor business expenses",
  },
  {
    id: "deposits",
    label: "Deposits",
    icon: "💳",
    description: "Handle financial deposits",
  },
  {
    id: "withdrawals",
    label: "Withdrawals",
    icon: "💵",
    description: "Process withdrawals and payouts",
  },
  {
    id: "cooperative",
    label: "Savings",
    icon: "👥",
    description: "Cooperative savings management",
  },
  {
    id: "reports",
    label: "Reports",
    icon: "📊",
    description: "Generate business reports",
  },
  {
    id: "reports-view",
    label: "View Reports",
    icon: "📋",
    description: "View generated reports",
  },
  {
    id: "insights",
    label: "Analytics",
    icon: "📈",
    description: "Business analytics and insights",
  },
  {
    id: "data-input",
    label: "Bulk Import",
    icon: "📤",
    description: "Import data in bulk",
  },
  {
    id: "super_admin_dashboard",
    label: "Dashboard",
    icon: "📊",
    description: "Visual analytics dashboard",
  },
  {
    id: "menu",
    label: "Menu Setup",
    icon: "🍽️",
    description: "Manage menu items",
  },
  {
    id: "user_management",
    label: "User Control",
    icon: "👤",
    description: "Manage users and permissions",
  },
];

const Settings = () => {
  const { userRole } = useAuth();
  const [tabSettings, setTabSettings] = useState<Record<string, boolean>>({});
<<<<<<< HEAD
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("tabSettings");
    const settings = stored ? JSON.parse(stored) : {};

    const initialSettings = allItems.reduce(
      (acc, item) => {
        acc[item.id] =
          settings[item.id] !== undefined ? settings[item.id] : true;
        return acc;
      },
      {} as Record<string, boolean>,
    );

    setTabSettings(initialSettings);
=======
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

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
>>>>>>> origin/main
  }, []);

  const saveSettings = () => {
    localStorage.setItem("tabSettings", JSON.stringify(tabSettings));
    window.location.reload();
  };

<<<<<<< HEAD
  const resetSettings = () => {
=======
  useEffect(() => {
    localStorage.setItem(
      "canEditTransactions",
      JSON.stringify(canEditTransactions),
    );
  }, [canEditTransactions]);

  const handleResetSettings = () => {
>>>>>>> origin/main
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

  const toggleTabSetting = (tabId: string) => {
    setTabSettings((prev) => ({
      ...prev,
      [tabId]: !prev[tabId],
    }));
  };

  const getAccessibleItems = () => {
    if (!userRole) return [];

    const roleAccessMap: Record<string, string[]> = {
      data_entry: [
        "orders",
        "charging",
        "expenses",
        "deposits",
        "withdrawals",
        "cooperative",
      ],
      reports_viewer: ["reports", "reports-view", "insights", "data-input"],
      super_admin: allItems.map((item) => item.id),
    };

    const accessibleIds = roleAccessMap[userRole] || [];
    return allItems.filter((item) => accessibleIds.includes(item.id));
  };

  const itemsToShow = showAll ? allItems : getAccessibleItems();

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
            Manage your account and application preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tab Visibility Settings */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="flex items-center justify-between text-black">
              <span>Tab Visibility</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAll(!showAll)}
                  className="hover:bg-brand-100"
                >
                  {showAll ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-sm text-gray-600 mb-4">
              Choose which tabs are visible in your dashboard. Changes will
              apply after saving.
            </div>

            <div className="space-y-4">
              {itemsToShow.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <Label
                        htmlFor={item.id}
                        className="font-medium text-black cursor-pointer"
                      >
                        {item.label}
                      </Label>
                      <p className="text-sm text-gray-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={item.id}
                    checked={tabSettings[item.id] || false}
                    onCheckedChange={() => toggleTabSetting(item.id)}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={saveSettings}
                className="bg-primary hover:bg-brand-400 text-black"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={resetSettings}
                className="hover:bg-brand-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>

<<<<<<< HEAD
        {/* Password Change */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Change Password</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <PasswordChangeForm />
          </CardContent>
        </Card>
=======
                  <Button className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200 transform hover:scale-105">
                    <Save className="h-4 w-4" />
                    Settings Saved
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle>Transaction Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-transactions">Enable Transaction Editing</Label>
              <Switch
                id="edit-transactions"
                checked={canEditTransactions}
                onCheckedChange={setCanEditTransactions}
              />
            </div>
          </CardContent>
        </Card>

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
>>>>>>> origin/main
      </div>

      {/* Additional Settings */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="text-black">Application Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-black mb-2">Your Role</h3>
              <p className="text-sm text-gray-600 capitalize">
                {userRole?.replace("_", " ") || "Not assigned"}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-black mb-2">
                Accessible Modules
              </h3>
              <p className="text-sm text-gray-600">
                {getAccessibleItems().length} of {allItems.length}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-black mb-2">Version</h3>
              <p className="text-sm text-gray-600">v1.0.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
