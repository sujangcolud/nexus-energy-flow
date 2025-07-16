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
  Database,
  ArrowLeft,
  UserCog,
  Upload,
  LayoutDashboard,
  Settings as SettingsIcon,
  Bell,
  Search,
  TrendingUp,
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
import ReportsTab from "@/components/tabs/ReportsTab";
import ReportsViewTab from "@/components/tabs/ReportsViewTab";
import MenuManagementTab from "@/components/tabs/MenuManagementTab";
import DataInputTab from "@/components/tabs/DataInputTab";
import UserManagementTab from "@/components/tabs/UserManagementTab";
import ShareInvestmentsTab from "@/components/tabs/ShareInvestmentsTab";

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

  // Define role-based navigation items with clean color schemes
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
        color: "bg-orange-600",
        bgColor: "bg-orange-50",
        description: "Manage food orders",
      },
      {
        id: "charging",
        path: "charging",
        label: "Charging",
        icon: Zap,
        component: ChargingTab,
        roles: ["data_entry", "super_admin"],
        color: "bg-yellow-600",
        bgColor: "bg-yellow-50",
        description: "Track energy consumption",
      },
      {
        id: "expenses",
        path: "expenses",
        label: "Expenses",
        icon: Receipt,
        component: ExpensesTab,
        roles: ["data_entry", "super_admin"],
        color: "bg-red-600",
        bgColor: "bg-red-50",
        description: "Monitor business expenses",
      },
      {
        id: "deposits",
        path: "deposits",
        label: "Deposits",
        icon: CreditCard,
        component: DepositsTab,
        roles: ["data_entry", "super_admin"],
        color: "bg-green-600",
        bgColor: "bg-green-50",
        description: "Handle financial deposits",
      },
      {
        id: "withdrawals",
        path: "withdrawals",
        label: "Withdrawals",
        icon: Banknote,
        component: WithdrawalsTab,
        roles: ["data_entry", "super_admin"],
        color: "bg-blue-600",
        bgColor: "bg-blue-50",
        description: "Process withdrawals",
      },
      {
        id: "cooperative",
        path: "cooperative",
        label: "Savings",
        icon: Users,
        component: CooperativeSavingsTab,
        roles: ["data_entry", "super_admin"],
        color: "bg-teal-600",
        bgColor: "bg-teal-50",
        description: "Cooperative savings management",
      },
      {
        id: "share_investments",
        path: "share-investments",
        label: "Share Investments",
        icon: TrendingUp,
        component: ShareInvestmentsTab,
        roles: ["data_entry", "super_admin"],
        color: "bg-emerald-600",
        bgColor: "bg-emerald-50",
        description: "Manage share investments",
      },
      // Add Analytics page - accessible to all users
      {
        id: "analytics",
        path: "analytics",
        label: "Analytics",
        icon: BarChart3,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-purple-600",
        bgColor: "bg-purple-50",
        description: "Financial analytics & insights",
      },

      // Reports and Analytics - accessible to reports_viewer, super_admin
      {
        id: "reports",
        path: "reports",
        label: "Reports",
        icon: FileText,
        component: ReportsTab,
        roles: ["reports_viewer", "super_admin"],
        color: "bg-violet-600",
        bgColor: "bg-violet-50",
        description: "Generate business reports",
      },
      {
        id: "reports-view",
        path: "reports-view",
        label: "View Reports",
        icon: FileText,
        component: ReportsViewTab,
        roles: ["user", "reports_viewer", "super_admin"],
        color: "bg-indigo-600",
        bgColor: "bg-indigo-50",
        description: "View generated reports",
      },
      {
        id: "insights",
        path: "insights",
        label: "Insights",
        icon: BarChart3,
        component: InsightsTab,
        roles: ["user", "reports_viewer", "super_admin"],
        color: "bg-green-600",
        bgColor: "bg-green-50",
        description: "Business insights",
      },
      {
        id: "data-input",
        path: "data-input",
        label: "Bulk Import",
        icon: Upload,
        component: DataInputTab,
        roles: ["reports_viewer", "super_admin"],
        color: "bg-sky-600",
        bgColor: "bg-sky-50",
        description: "Import data in bulk",
      },

      // Super Admin Only
      {
        id: "super_admin_dashboard",
        path: "super-admin",
        label: "Infographics",
        icon: LayoutDashboard,
        roles: ["super_admin"],
        color: "bg-rose-600",
        bgColor: "bg-rose-50",
        description: "Visual analytics dashboard",
      },
      {
        id: "menu",
        path: "menu",
        label: "Menu Setup",
        icon: UtensilsCrossed,
        component: MenuManagementTab,
        roles: ["super_admin"],
        color: "bg-amber-600",
        bgColor: "bg-amber-50",
        description: "Manage menu items",
      },
      {
        id: "user_management",
        path: "user-management",
        label: "User Control",
        icon: UserCog,
        component: UserManagementTab,
        roles: ["super_admin"],
        color: "bg-slate-600",
        bgColor: "bg-slate-50",
        description: "Manage users & permissions",
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
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg shadow-sm bg-slate-600 text-white">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">
                    EcoSoft Pro
                  </h1>
                  <p className="text-sm text-slate-600">
                    Business Management System
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <User className="h-4 w-4" />
                  <span>{user?.email}</span>
                  {userRole && (
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium">
                      {userRole.replace("_", " ")}
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2 hover:bg-red-50 hover:border-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
                <Link to="settings">
                  <Button
                    variant="outline"
                    size="icon"
                    className="hover:bg-slate-100 hover:border-slate-300"
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto shadow-lg border border-slate-200 bg-white">
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
              <div className="p-4 rounded-full bg-slate-600 text-white">
                <User className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                Access Pending
              </h2>
              <p className="text-center text-slate-600">
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              {isSubPageActive && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="hover:bg-slate-100 hover:border-slate-300 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 group ${isActive ? "cursor-default" : ""}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="p-3 rounded-lg shadow-sm transition-all group-hover:shadow-md bg-slate-600 text-white">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                      <h1
                        className={`text-xl font-bold transition-colors ${isActive ? "text-slate-800" : "text-slate-700 group-hover:text-slate-800"}`}
                      >
                        EcoSoft Pro
                      </h1>
                      <p className="text-sm text-slate-600">
                        Business Management System
                      </p>
                    </div>
                  </>
                )}
              </NavLink>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <div className="p-2 rounded-full bg-slate-100">
                  <User className="h-4 w-4 text-slate-600" />
                </div>
                <span className="font-medium">{user?.email}</span>
                {userRole && (
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium border border-slate-200">
                    {userRole.replace("_", " ")}
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="hover:bg-slate-100 hover:border-slate-300 transition-colors"
              >
                <Bell className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2 hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>

              <Link to="settings">
                <Button
                  variant="outline"
                  size="icon"
                  className="hover:bg-slate-100 hover:border-slate-300 transition-colors"
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
            <h2 className="text-2xl font-bold text-slate-800">
              {currentPageTitle}
            </h2>
          </div>
        )}

        {/* Show navigation cards only on the main /dashboard path */}
        {!isSubPageActive ? (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-slate-800 mb-4">
                Welcome back, {user?.name || "User"}!
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
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
                    <Card
                      className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${item.bgColor} border border-slate-200 h-full`}
                    >
                      <CardContent className="flex flex-col items-center justify-center p-6 space-y-4 h-full">
                        <div
                          className={`p-4 rounded-lg transition-all duration-300 ${item.color} text-white shadow-sm group-hover:shadow-md`}
                        >
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="font-semibold text-lg text-slate-800">
                            {item.label}
                          </p>
                          <p className="text-sm text-slate-600">
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
              <Card className="bg-blue-50 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total Modules
                      </p>
                      <p className="text-2xl font-bold text-blue-800">
                        {navItems.length}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-600 rounded-lg text-white">
                      <LayoutDashboard className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Your Role
                      </p>
                      <p className="text-2xl font-bold text-green-800 capitalize">
                        {userRole?.replace("_", " ")}
                      </p>
                    </div>
                    <div className="p-3 bg-green-600 rounded-lg text-white">
                      <User className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 font-medium">
                        System Status
                      </p>
                      <p className="text-2xl font-bold text-slate-800">
                        Online
                      </p>
                    </div>
                    <div className="p-3 bg-slate-600 rounded-lg text-white">
                      <BarChart3 className="h-6 w-6" />
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
