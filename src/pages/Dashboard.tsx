import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Outlet,
  useLocation,
  NavLink,
  Link,
  useNavigate,
} from "react-router-dom";
import {
  LogOut,
  User,
  ShoppingCart,
  Zap,
  Receipt,
  CreditCard,
  Banknote,
  Users,
  BarChart3,
  FileText,
  UtensilsCrossed,
  ArrowLeft,
  UserCog,
  Upload,
  LayoutDashboard,
  Settings as SettingsIcon,
  Bell,
} from "lucide-react";
import ChatBot from "@/components/ChatBot";

// Tab components are now rendered by routes, but their types/icons might be needed for nav items.
import OrdersTab from "@/components/tabs/OrdersTab";
import ChargingTab from "@/components/tabs/ChargingTab";
import ExpensesTab from "@/components/tabs/ExpensesTab";
import DepositsTab from "@/components/tabs/DepositsTab";
import WithdrawalsTab from "@/components/tabs/WithdrawalsTab";
import CooperativeSavingsTab from "@/components/tabs/CooperativeSavingsTab";
import InsightsTab from "@/components/tabs/InsightsTab";
import CombinedReportsTab from "@/components/tabs/CombinedReportsTab";
import MenuManagementTab from "@/components/tabs/MenuManagementTab";
import DataInputTab from "@/components/tabs/DataInputTab";
import UserManagementTab from "@/components/tabs/UserManagementTab";

const Dashboard = () => {
  const { user, signOut, userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isChatBotOpen, setIsChatBotOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Define role-based navigation items with professional styling
  const getNavItems = () => {
    const allItems = [
      // Data Entry - accessible to data_entry, super_admin
      {
        id: "orders",
        path: "orders",
        label: "Orders",
        icon: ShoppingCart,
        component: OrdersTab,
        roles: ["data_entry", "super_admin"],
        description: "Manage food orders and transactions",
      },
      {
        id: "charging",
        path: "charging",
        label: "Charging",
        icon: Zap,
        component: ChargingTab,
        roles: ["data_entry", "super_admin"],
        description: "Track energy consumption and sessions",
      },
      {
        id: "expenses",
        path: "expenses",
        label: "Expenses",
        icon: Receipt,
        component: ExpensesTab,
        roles: ["data_entry", "super_admin"],
        description: "Monitor business expenses and costs",
      },
      {
        id: "deposits",
        path: "deposits",
        label: "Deposits",
        icon: CreditCard,
        component: DepositsTab,
        roles: ["data_entry", "super_admin"],
        description: "Handle financial deposits",
      },
      {
        id: "withdrawals",
        path: "withdrawals",
        label: "Withdrawals",
        icon: Banknote,
        component: WithdrawalsTab,
        roles: ["data_entry", "super_admin"],
        description: "Process withdrawals and payments",
      },
      {
        id: "cooperative",
        path: "cooperative",
        label: "Savings",
        icon: Users,
        component: CooperativeSavingsTab,
        roles: ["data_entry", "super_admin"],
        description: "Cooperative savings management",
      },

      // Reports and Analytics - accessible to reports_viewer, super_admin
      {
        id: "reports",
        path: "reports",
        label: "Reports",
        icon: FileText,
        component: CombinedReportsTab,
        roles: ["reports_viewer", "super_admin"],
        description: "Generate, view, and export business reports",
      },
      {
        id: "insights",
        path: "insights",
        label: "Analytics",
        icon: BarChart3,
        component: InsightsTab,
        roles: ["reports_viewer", "super_admin"],
        description: "Business analytics and insights",
      },
      {
        id: "data-input",
        path: "data-input",
        label: "Bulk Import",
        icon: Upload,
        component: DataInputTab,
        roles: ["reports_viewer", "super_admin"],
        description: "Import data in bulk format",
      },

      // Super Admin Only
      {
        id: "super_admin_dashboard",
        path: "super-admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["super_admin"],
        description: "Visual analytics dashboard",
      },
      {
        id: "menu",
        path: "menu",
        label: "Menu Setup",
        icon: UtensilsCrossed,
        component: MenuManagementTab,
        roles: ["super_admin"],
        description: "Manage menu items and categories",
      },
      {
        id: "user_management",
        path: "user-management",
        label: "User Control",
        icon: UserCog,
        component: UserManagementTab,
        roles: ["super_admin"],
        description: "Manage users and permissions",
      },
    ];

    if (!userRole) return [];

    const storedSettings = localStorage.getItem("tabSettings");
    const tabSettings = storedSettings ? JSON.parse(storedSettings) : {};

    return allItems.filter(
      (item) => item.roles.includes(userRole) && (tabSettings[item.id] ?? true),
    );
  };

  const navItems = getNavItems();

  const isSubPageActive =
    location.pathname !== "/dashboard" && location.pathname !== "/dashboard/";
  const currentPage = navItems.find((item) =>
    location.pathname.includes(`/dashboard/${item.path}`),
  );
  const currentPageTitle = currentPage?.label || "Dashboard";

  // Show access denied message if user has no accessible items
  if (userRole && navItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary rounded-xl">
                  <BarChart3 className="h-6 w-6 text-black" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-black">
                    Energy Palace Nexus Point
                  </h1>
                  <p className="text-sm text-gray-600">
                    Business Management System
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="h-4 w-4" />
                  <span>{user?.email}</span>
                  {userRole && (
                    <span className="bg-brand-100 text-black px-3 py-1 rounded-full text-xs font-medium">
                      {userRole.replace("_", " ")}
                    </span>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <Link to="settings">
                  <Button variant="outline" size="icon">
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
              <div className="p-4 rounded-full bg-brand-100">
                <User className="h-8 w-8 text-black" />
              </div>
              <h2 className="text-xl font-semibold text-black">
                Access Pending
              </h2>
              <p className="text-center text-gray-600">
                Your account role ({userRole.replace("_", " ")}) is being
                configured. Please contact your administrator for access.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              {isSubPageActive && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="hover:bg-brand-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <NavLink
                to="/dashboard"
                end
                className="flex items-center gap-3 group"
              >
                <div className="p-3 bg-primary rounded-xl transition-all group-hover:bg-brand-400">
                  <BarChart3 className="h-6 w-6 text-black" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-black group-hover:text-gray-700 transition-colors">
                    Energy Palace Nexus Point
                  </h1>
                  <p className="text-sm text-gray-600">
                    Business Management System
                  </p>
                </div>
              </NavLink>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="p-2 rounded-full bg-brand-100">
                  <User className="h-4 w-4 text-black" />
                </div>
                <span className="font-medium">{user?.email}</span>
                {userRole && (
                  <span className="bg-brand-100 text-black px-3 py-1 rounded-full text-xs font-medium border border-brand-200">
                    {userRole.replace("_", " ")}
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="hover:bg-brand-50"
              >
                <Bell className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>

              <Link to="settings">
                <Button
                  variant="outline"
                  size="icon"
                  className="hover:bg-brand-50"
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile-only active page title */}
        {isSubPageActive && (
          <div className="sm:hidden mb-6 text-center">
            <h2 className="text-2xl font-bold text-black">
              {currentPageTitle}
            </h2>
          </div>
        )}

        {/* Show navigation cards only on the main /dashboard path */}
        {!isSubPageActive ? (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-black mb-4">
                Welcome back, {user?.name || "User"}!
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Choose a module below to manage your business operations
                efficiently
              </p>
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link key={item.id} to={item.path} className="block group">
                    <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary border border-gray-200 hover:scale-105 bg-white h-full">
                      <CardContent className="flex flex-col items-center justify-center p-6 space-y-4 h-full">
                        <div className="p-4 bg-brand-100 rounded-xl transition-all duration-300 group-hover:bg-primary">
                          <Icon className="h-8 w-8 text-black" />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="font-semibold text-lg text-black">
                            {item.label}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Total Modules
                      </p>
                      <p className="text-2xl font-bold text-black">
                        {navItems.length}
                      </p>
                    </div>
                    <div className="p-3 bg-brand-100 rounded-xl">
                      <LayoutDashboard className="h-6 w-6 text-black" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Your Role
                      </p>
                      <p className="text-2xl font-bold text-black capitalize">
                        {userRole?.replace("_", " ")}
                      </p>
                    </div>
                    <div className="p-3 bg-brand-100 rounded-xl">
                      <User className="h-6 w-6 text-black" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        System Status
                      </p>
                      <p className="text-2xl font-bold text-black">Online</p>
                    </div>
                    <div className="p-3 bg-brand-100 rounded-xl">
                      <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="h-2 w-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* ChatBot Component */}
      <ChatBot
        isOpen={isChatBotOpen}
        onToggle={() => setIsChatBotOpen(!isChatBotOpen)}
      />
    </div>
  );
};

export default Dashboard;
