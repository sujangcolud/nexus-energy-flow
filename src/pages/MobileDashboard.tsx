import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import DailyClosingSystem from "@/components/DailyClosingSystem";
import BatchDailyClosingSystem from "@/components/BatchDailyClosingSystem";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Settings,
  Bell,
  Search,
  TrendingUp,
  Package,
  Menu,
  Home,
  Calendar,
  Activity,
  ChevronRight,
  Wifi,
  Battery,
  Signal,
} from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const MobileDashboard = () => {
  const { user, signOut, userRole } = useAuth();
  const { hasTabAccess } = useUserPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tabSettings, setTabSettings] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDailyClosingOpen, setIsDailyClosingOpen] = useState(false);
  const [isBatchClosingOpen, setIsBatchClosingOpen] = useState(false);
  const [showBatchClosing, setShowBatchClosing] = useState(true);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const storedSettings = localStorage.getItem("tabSettings");
    if (storedSettings) {
      setTabSettings(JSON.parse(storedSettings));
    }

    // Load batch closing setting
    const batchClosingSetting = localStorage.getItem("showBatchClosing");
    if (batchClosingSetting !== null) {
      setShowBatchClosing(JSON.parse(batchClosingSetting));
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDailyClosing = () => {
    setIsDailyClosingOpen(true);
  };

  // Mobile-optimized navigation items
  const getNavItems = () => {
    const allItems = [
      {
        id: "orders",
        path: "orders",
        label: "Orders",
        icon: ShoppingCart,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-orange-500 to-orange-600",
        bgColor: "bg-orange-50",
        description: "Manage food orders",
        category: "transactions",
      },
      {
        id: "charging",
        path: "charging",
        label: "Charging",
        icon: Zap,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-yellow-500 to-yellow-600",
        bgColor: "bg-yellow-50",
        description: "Track energy consumption",
        category: "transactions",
      },
      {
        id: "expenses",
        path: "expenses",
        label: "Expenses",
        icon: Receipt,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-red-500 to-red-600",
        bgColor: "bg-red-50",
        description: "Monitor business expenses",
        category: "transactions",
      },
      {
        id: "deposits",
        path: "deposits",
        label: "Deposits",
        icon: CreditCard,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-green-500 to-green-600",
        bgColor: "bg-green-50",
        description: "Handle financial deposits",
        category: "financial",
      },
      {
        id: "withdrawals",
        path: "withdrawals",
        label: "Withdrawals",
        icon: Banknote,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-blue-500 to-blue-600",
        bgColor: "bg-blue-50",
        description: "Process withdrawals",
        category: "financial",
      },
      {
        id: "cooperative",
        path: "cooperative",
        label: "Savings",
        icon: Users,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-teal-500 to-teal-600",
        bgColor: "bg-teal-50",
        description: "Cooperative savings",
        category: "financial",
      },
      {
        id: "share_investments",
        path: "share-investments",
        label: "Investments",
        icon: TrendingUp,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-emerald-500 to-emerald-600",
        bgColor: "bg-emerald-50",
        description: "Share investments",
        category: "financial",
      },
      {
        id: "inventory",
        path: "inventory",
        label: "Inventory",
        icon: Package,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-purple-500 to-purple-600",
        bgColor: "bg-purple-50",
        description: "Inventory management",
        category: "management",
      },

      {
        id: "bulk_import",
        path: "bulk-import",
        label: "Import",
        icon: Upload,
        roles: ["reports_viewer", "super_admin"],
        color: "from-indigo-500 to-indigo-600",
        bgColor: "bg-indigo-50",
        description: "Data import",
        category: "management",
      },
      {
        id: "menu",
        path: "menu",
        label: "Menu",
        icon: UtensilsCrossed,
        roles: ["super_admin"],
        color: "from-amber-500 to-amber-600",
        bgColor: "bg-amber-50",
        description: "Menu management",
        category: "management",
      },
      {
        id: "user_management",
        path: "user-management",
        label: "Users",
        icon: UserCog,
        roles: ["super_admin"],
        color: "from-pink-500 to-pink-600",
        bgColor: "bg-pink-50",
        description: "User management",
        category: "management",
      },
      {
        id: "vat_entry",
        path: "vat-entry",
        label: "VAT",
        icon: FileText,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-lime-500 to-lime-600",
        bgColor: "bg-lime-50",
        description: "VAT entries",
        category: "transactions",
      },
      {
        id: "dashboard_studio",
        path: "dashboard-studio",
        label: "Dashboard Studio",
        icon: BarChart3,
        roles: ["user", "reports_viewer", "super_admin"],
        color: "from-purple-500 to-purple-600",
        bgColor: "bg-purple-50",
        description: "Create custom dashboards",
        category: "analytics",
      },
    ];

    if (!userRole) return [];

    // Show all items to all users (role restrictions removed as requested)
    return allItems.filter((item) => tabSettings[item.id] ?? true);
  };

  const navItems = getNavItems();
  const isSubPageActive =
    location.pathname !== "/dashboard" && location.pathname !== "/dashboard/";
  const currentPage = navItems.find((item) =>
    location.pathname.includes(`/dashboard/${item.path}`),
  );

  // Group items by category for mobile
  const groupedItems = navItems.reduce(
    (acc, item) => {
      const category = item.category || "other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, typeof navItems>,
  );

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "transactions":
        return "Transactions";
      case "financial":
        return "Financial";

      case "management":
        return "Management";
      default:
        return "Other";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "transactions":
        return ShoppingCart;
      case "financial":
        return CreditCard;

      case "management":
        return Settings;
      default:
        return LayoutDashboard;
    }
  };

  // Mobile app header
  const MobileHeader = () => (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubPageActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="bg-gradient-to-b from-blue-600 to-purple-600 text-white p-6">
                  <SheetHeader>
                    <SheetTitle className="text-white text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {user?.name || user?.email}
                          </div>
                          <div className="text-sm opacity-90 capitalize">
                            {userRole?.replace("_", " ")}
                          </div>
                        </div>
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      onClick={handleDailyClosing}
                      className="w-full justify-start gap-3 h-12"
                    >
                      <Database className="h-5 w-5" />
                      Daily Closing
                    </Button>
                    {showBatchClosing && (
                      <Button
                        variant="ghost"
                        onClick={() => setIsBatchClosingOpen(true)}
                        className="w-full justify-start gap-3 h-12"
                      >
                        <Calendar className="h-5 w-5" />
                        Batch Closing
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/dashboard/settings")}
                      className="w-full justify-start gap-3 h-12"
                    >
                      <SettingsIcon className="h-5 w-5" />
                      Settings
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="w-full justify-start gap-3 h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
          <div>
            <h1 className="text-lg font-bold">
              {isSubPageActive ? currentPage?.label : "EcoSoft Pro"}
            </h1>
            <p className="text-xs opacity-90">
              {isSubPageActive
                ? currentPage?.description
                : "Business Management"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile app grid
  const MobileAppGrid = () => (
    <div className="p-4 space-y-6">
      {Object.entries(groupedItems).map(([category, items]) => {
        const CategoryIcon = getCategoryIcon(category);
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 px-2">
              <CategoryIcon className="h-4 w-4" />
              {getCategoryTitle(category)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.id}
                    onClick={() => {
                      navigate(item.path);
                      setIsMenuOpen(false);
                    }}
                    className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 border-0 shadow-lg"
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                      <div
                        className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Quick action buttons for mobile
  const QuickActions = () => (
    <div className="px-4 pb-4">
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("orders")}
            className="h-12 flex flex-col gap-1 border-2"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="text-xs">New Order</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("expenses")}
            className="h-12 flex flex-col gap-1 border-2"
          >
            <Receipt className="h-4 w-4" />
            <span className="text-xs">Add Expense</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader />

      {/* Main Content */}
      <main className="pb-safe">
        {!isSubPageActive ? (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="px-4 pt-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Welcome back!
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {navItems.length}
                    </p>
                    <p className="text-xs text-gray-600">Modules</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">Online</p>
                    <p className="text-xs text-gray-600">Status</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 capitalize">
                      {userRole?.split("_")[0]}
                    </p>
                    <p className="text-xs text-gray-600">Role</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* App Grid */}
            <MobileAppGrid />
          </div>
        ) : (
          <div className="bg-white min-h-screen">
            <Outlet />
          </div>
        )}
      </main>

      {/* Daily Closing System */}
      <DailyClosingSystem
        isOpen={isDailyClosingOpen}
        onClose={() => setIsDailyClosingOpen(false)}
      />

      {/* Batch Daily Closing System */}
      <BatchDailyClosingSystem
        isOpen={isBatchClosingOpen}
        onClose={() => setIsBatchClosingOpen(false)}
      />
    </div>
  );
};

export default MobileDashboard;
