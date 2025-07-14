import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Settings as SettingsIcon,
  Palette,
  Eye,
  EyeOff,
  Sparkles,
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
    icon: "👁️",
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
    label: "Bulk Data Import",
    icon: "📤",
    description: "Import data in bulk",
  },
  {
    id: "super_admin_dashboard",
    label: "Admin Dashboard",
    icon: "🔧",
    description: "Administrator control panel",
  },
  {
    id: "menu",
    label: "Menu Management",
    icon: "🍽️",
    description: "Manage menu items and pricing",
  },
  {
    id: "user_management",
    label: "User Management",
    icon: "👤",
    description: "Manage users and permissions",
  },
];

const Settings = () => {
  const { user } = useAuth();
  const [tabSettings, setTabSettings] = useState<Record<string, boolean>>({});
  const [showPasswordForm, setShowPasswordForm] = useState(false);

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
  }, []);

  const handleToggle = (tabId: string) => {
    const newSettings = { ...tabSettings, [tabId]: !tabSettings[tabId] };
    setTabSettings(newSettings);
    localStorage.setItem("tabSettings", JSON.stringify(newSettings));
  };

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
              </CardHeader>
              <CardContent className="space-y-4">
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
