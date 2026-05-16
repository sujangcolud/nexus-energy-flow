import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import { DailyClosingSystem } from "@/components/DailyClosingSystem";
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
  Landmark,
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
  Lock,
  FileSpreadsheet,
  Boxes,
  ChefHat,
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
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Manage food orders",
        category: "transactions",
      },
      {
        id: "charging",
        path: "charging",
        label: "Charging",
        icon: Zap,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Track energy consumption",
        category: "transactions",
      },
      {
        id: "expenses",
        path: "expenses",
        label: "Expenses",
        icon: Receipt,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Monitor business expenses",
        category: "transactions",
      },
      {
        id: "deposits",
        path: "deposits",
        label: "Deposits",
        icon: CreditCard,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Handle financial deposits",
        category: "financial",
      },
      {
        id: "withdrawals",
        path: "withdrawals",
        label: "Savings & Withdrawals",
        icon: Banknote,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Savings & withdrawals",
        category: "financial",
      },
      {
        id: "loans",
        path: "loans",
        label: "Loans",
        icon: Landmark,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Loans & Repayments",
        category: "financial",
      },
      {
        id: "share_investments",
        path: "share-investments",
        label: "Investments",
        icon: TrendingUp,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Share investments",
        category: "financial",
      },
      {
        id: "expense_bookings",
        path: "expense-bookings",
        label: "Expense Bookings",
        icon: FileText,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Manage expense bookings",
        category: "financial",
      },
      {
        id: "inventory",
        path: "inventory",
        label: "Inventory",
        icon: Package,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Inventory management",
        category: "management",
      },

      {
        id: "bulk_import",
        path: "bulk-import",
        label: "Import",
        icon: Upload,
        roles: ["reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Data import",
        category: "management",
      },
      {
        id: "menu",
        path: "menu",
        label: "Menu",
        icon: UtensilsCrossed,
        roles: ["super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Menu management",
        category: "management",
      },
      {
        id: "recipes",
        path: "recipes",
        label: "Recipes",
        icon: ChefHat,
        roles: ["super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Link menu items to inventory ingredients",
        category: "management",
      },
      {
        id: "user_management",
        path: "user-management",
        label: "Users",
        icon: UserCog,
        roles: ["super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "User management",
        category: "management",
      },
      {
        id: "vat_entry",
        path: "vat-entry",
        label: "VAT",
        icon: FileText,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "VAT entries",
        category: "transactions",
      },
      {
        id: "dashboard_studio",
        path: "dashboard-studio",
        label: "Dashboard Studio",
        icon: BarChart3,
        roles: ["user", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Custom dashboards",
        category: "analytics",
      },
      {
        id: "daily_summary_report",
        path: "daily-summary-report",
        label: "Daily Summary",
        icon: FileText,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Daily summary with date range",
        category: "analytics",
      },
      {
        id: "command_center",
        path: "command-center",
        label: "Command Center",
        icon: Activity,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "KPIs, cashflow & forecast",
        category: "analytics",
      },
      {
        id: "report_builder",
        path: "report-builder",
        label: "Report Builder",
        icon: FileSpreadsheet,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Custom reports + CSV",
        category: "analytics",
      },
      {
        id: "closing_wizard",
        path: "closing-wizard",
        label: "Closing Wizard",
        icon: Lock,
        roles: ["super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Reconcile & lock the day",
        category: "management",
      },
      {
        id: "inventory_bridge",
        path: "inventory-bridge",
        label: "Inventory Bridge",
        icon: Boxes,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Auto stock-out from sales",
        category: "management",
      },
      {
        id: "bi_suite",
        path: "bi-suite",
        label: "BI & Correlation Suite",
        icon: Activity,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-primary",
        bgColor: "bg-primary/5",
        description: "Date-aligned correlations, audit & recommendations",
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
      case "analytics":
        return "Analytics & Reports";
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
      case "analytics":
        return BarChart3;
      case "management":
        return Settings;
      default:
        return LayoutDashboard;
    }
  };

  // Mobile app header
  const MobileHeader = () => (
    <div className="bg-primary text-primary-foreground px-4 py-4">
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
                <div className="bg-primary text-primary-foreground p-6">
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
                      className="w-full justify-start gap-3 h-12 text-destructive hover:text-red-700 hover:bg-destructive/5"
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
              {isSubPageActive ? currentPage?.label : "Energy Palace"}
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
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-2">
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
                        <p className="font-semibold text-sm text-foreground">
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
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

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <MobileHeader />

      {/* Main Content */}
      <main className="pb-safe">
        {!isSubPageActive ? (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="px-4 pt-6">
              <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      Welcome back!
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>

              </div>
            </div>

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
        userId={user?.id || ""}
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
