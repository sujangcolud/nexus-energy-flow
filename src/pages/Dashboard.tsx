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
  Sparkles,
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

  // Define role-based navigation items with vibrant color schemes
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
        gradient: "from-orange-400 via-pink-500 to-red-500",
        bgGradient: "from-orange-50 to-pink-50",
        description: "Manage food orders",
      },
      {
        id: "charging",
        path: "charging",
        label: "Charging",
        icon: Zap,
        component: ChargingTab,
        roles: ["data_entry", "super_admin"],
        gradient: "from-yellow-400 via-orange-500 to-red-500",
        bgGradient: "from-yellow-50 to-orange-50",
        description: "Track energy consumption",
      },
      {
        id: "expenses",
        path: "expenses",
        label: "Expenses",
        icon: Receipt,
        component: ExpensesTab,
        roles: ["data_entry", "super_admin"],
        gradient: "from-red-500 via-pink-500 to-purple-600",
        bgGradient: "from-red-50 to-purple-50",
        description: "Monitor business expenses",
      },
      {
        id: "deposits",
        path: "deposits",
        label: "Deposits",
        icon: CreditCard,
        component: DepositsTab,
        roles: ["data_entry", "super_admin"],
        gradient: "from-green-400 via-emerald-500 to-teal-600",
        bgGradient: "from-green-50 to-emerald-50",
        description: "Handle financial deposits",
      },
      {
        id: "withdrawals",
        path: "withdrawals",
        label: "Withdrawals",
        icon: Banknote,
        component: WithdrawalsTab,
        roles: ["data_entry", "super_admin"],
        gradient: "from-blue-500 via-indigo-500 to-purple-600",
        bgGradient: "from-blue-50 to-indigo-50",
        description: "Process withdrawals",
      },
      {
        id: "cooperative",
        path: "cooperative",
        label: "Savings",
        icon: Users,
        component: CooperativeSavingsTab,
        roles: ["data_entry", "super_admin"],
        gradient: "from-teal-400 via-cyan-500 to-blue-600",
        bgGradient: "from-teal-50 to-cyan-50",
        description: "Cooperative savings management",
      },

      // Reports and Analytics - accessible to reports_viewer, super_admin
      {
        id: "reports",
        path: "reports",
        label: "Reports",
        icon: FileText,
        component: ReportsTab,
        roles: ["reports_viewer", "super_admin"],
        gradient: "from-violet-500 via-purple-500 to-pink-600",
        bgGradient: "from-violet-50 to-purple-50",
        description: "Generate business reports",
      },
      {
        id: "reports-view",
        path: "reports-view",
        label: "View Reports",
        icon: FileText,
        component: ReportsViewTab,
        roles: ["reports_viewer", "super_admin"],
        gradient: "from-indigo-500 via-blue-500 to-cyan-600",
        bgGradient: "from-indigo-50 to-blue-50",
        description: "View generated reports",
      },
      {
        id: "insights",
        path: "insights",
        label: "Analytics",
        icon: BarChart3,
        component: InsightsTab,
        roles: ["reports_viewer", "super_admin"],
        gradient: "from-emerald-500 via-green-500 to-lime-600",
        bgGradient: "from-emerald-50 to-green-50",
        description: "Business analytics & insights",
      },
      {
        id: "data-input",
        path: "data-input",
        label: "Bulk Import",
        icon: Upload,
        component: DataInputTab,
        roles: ["reports_viewer", "super_admin"],
        gradient: "from-sky-400 via-blue-500 to-indigo-600",
        bgGradient: "from-sky-50 to-blue-50",
        description: "Import data in bulk",
      },

      // Super Admin Only
      {
        id: "super_admin_dashboard",
        path: "super-admin",
        label: "Infographics",
        icon: LayoutDashboard,
        roles: ["super_admin"],
        gradient: "from-rose-500 via-pink-500 to-fuchsia-600",
        bgGradient: "from-rose-50 to-pink-50",
        description: "Visual analytics dashboard",
      },
      {
        id: "menu",
        path: "menu",
        label: "Menu Setup",
        icon: UtensilsCrossed,
        component: MenuManagementTab,
        roles: ["super_admin"],
        gradient: "from-amber-400 via-yellow-500 to-orange-600",
        bgGradient: "from-amber-50 to-yellow-50",
        description: "Manage menu items",
      },
      {
        id: "user_management",
        path: "user-management",
        label: "User Control",
        icon: UserCog,
        component: UserManagementTab,
        roles: ["super_admin"],
        gradient: "from-slate-600 via-gray-700 to-zinc-800",
        bgGradient: "from-slate-50 to-gray-50",
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-purple-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    EcoSoft Pro
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
                    <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                      {userRole.replace("_", " ")}
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:border-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
                <Link to="settings">
                  <Button
                    variant="outline"
                    size="icon"
                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300"
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto shadow-2xl border-0 bg-white/70 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
              <div className="p-4 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                <User className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/2 right-10 w-96 h-96 bg-gradient-to-r from-pink-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-10 left-1/3 w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-purple-200/50 sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              {isSubPageActive && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-300 hover:scale-105 transition-all duration-200"
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
                    <div className="p-3 rounded-xl shadow-lg transition-all group-hover:shadow-xl group-hover:scale-105 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                      <h1
                        className={`text-xl font-bold transition-colors flex items-center gap-2 ${isActive ? "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : "text-gray-800 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent"}`}
                      >
                        EcoSoft Pro
                        <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                      </h1>
                      <p className="text-sm text-gray-600">
                        Business Management System
                      </p>
                    </div>
                  </>
                )}
              </NavLink>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="p-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100">
                  <User className="h-4 w-4 text-purple-600" />
                </div>
                <span className="font-medium">{user?.email}</span>
                {userRole && (
                  <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium border border-purple-200">
                    {userRole.replace("_", " ")}
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 hover:scale-105 transition-all duration-200"
              >
                <Bell className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:border-red-300 hover:scale-105 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>

              <Link to="settings">
                <Button
                  variant="outline"
                  size="icon"
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 hover:scale-105 transition-all duration-200"
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Mobile-only active page title */}
        {isSubPageActive && (
          <div className="sm:hidden mb-6 text-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {currentPageTitle}
            </h2>
          </div>
        )}

        {/* Show navigation cards only on the main /dashboard path */}
        {!isSubPageActive ? (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-4">
                Welcome back, {user?.name || "User"}! ✨
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Choose a module below to manage your business operations with
                style and efficiency
              </p>
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link key={item.id} to={item.path} className="block group">
                    <Card
                      className={`cursor-pointer transition-all duration-300 ease-in-out hover:shadow-2xl hover:scale-110 hover:-rotate-1 bg-gradient-to-br ${item.bgGradient} hover:shadow-purple-200/50 border-0 overflow-hidden relative h-full`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <CardContent className="flex flex-col items-center justify-center p-6 space-y-4 h-full relative z-10">
                        <div
                          className={`p-4 rounded-2xl transition-all duration-300 ease-in-out bg-gradient-to-r ${item.gradient} text-white shadow-lg group-hover:shadow-xl group-hover:scale-110`}
                        >
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="font-bold text-lg transition-colors duration-200 ease-in-out text-gray-800 group-hover:text-gray-900">
                            {item.label}
                          </p>
                          <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-200">
                            {item.description}
                          </p>
                        </div>
                      </CardContent>

                      {/* Floating dots decoration */}
                      <div className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute top-2 right-6 w-1 h-1 bg-gradient-to-r from-pink-400 to-red-500 rounded-full opacity-40 group-hover:opacity-80 transition-opacity duration-300"></div>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white">
                      <LayoutDashboard className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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
                    <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                      <User className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        System Status
                      </p>
                      <p className="text-2xl font-bold text-purple-800">
                        Online
                      </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                      <Sparkles className="h-6 w-6" />
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
