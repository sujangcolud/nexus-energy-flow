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
  ShieldCheck,
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
  const [scrollTilt, setScrollTilt] = useState(0);

  // Scroll velocity tracking for 3D tilt
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const velocity = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      // Calculate tilt based on velocity, capped at 12deg
      const tilt = Math.max(-12, Math.min(12, velocity * 0.5));
      setScrollTilt(tilt);

      // Snap back to flat after scroll stops
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setScrollTilt(0);
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

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
        color: "from-primary to-primary/80",
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
        color: "from-secondary to-secondary/80",
        bgColor: "bg-secondary/5",
        description: "Track energy consumption",
        category: "transactions",
      },
      {
        id: "ev_live",
        path: "/ev-dashboard.html",
        label: "EV Live",
        icon: Activity,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-blue-600 to-blue-400",
        bgColor: "bg-blue-50/5",
        description: "Live charging status",
        category: "transactions",
        isExternal: true,
      },
      {
        id: "expenses",
        path: "expenses",
        label: "Expenses",
        icon: Receipt,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-primary to-primary/80",
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
        color: "from-secondary to-secondary/80",
        bgColor: "bg-secondary/5",
        description: "Handle financial deposits",
        category: "financial",
      },
      {
        id: "withdrawals",
        path: "withdrawals",
        label: "Savings & Withdrawals",
        icon: Banknote,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-primary to-primary/80",
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
        color: "from-secondary to-secondary/80",
        bgColor: "bg-secondary/5",
        description: "Loans & Repayments",
        category: "financial",
      },
      {
        id: "share_investments",
        path: "share-investments",
        label: "Investments",
        icon: TrendingUp,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-primary to-primary/80",
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
        color: "from-secondary to-secondary/80",
        bgColor: "bg-secondary/5",
        description: "Manage expense bookings",
        category: "financial",
      },
      {
        id: "inventory",
        path: "inventory",
        label: "Inventory",
        icon: Package,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-primary to-primary/80",
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
        color: "from-secondary to-secondary/80",
        bgColor: "bg-secondary/5",
        description: "Data import",
        category: "management",
      },
      {
        id: "menu",
        path: "menu",
        label: "Menu",
        icon: UtensilsCrossed,
        roles: ["super_admin"],
        color: "from-primary to-primary/80",
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
        color: "from-secondary to-secondary/80",
        bgColor: "bg-secondary/5",
        description: "Link menu items to inventory ingredients",
        category: "management",
      },
      {
        id: "user_management",
        path: "user-management",
        label: "Users",
        icon: UserCog,
        roles: ["super_admin"],
        color: "from-primary to-primary/80",
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
        color: "from-secondary to-secondary/80",
        bgColor: "bg-secondary/5",
        description: "VAT entries",
        category: "transactions",
      },
      {
        id: "dashboard_studio",
        path: "dashboard-studio",
        label: "Dashboard Studio",
        icon: BarChart3,
        roles: ["user", "reports_viewer", "super_admin"],
        color: "from-primary to-primary/80",
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
        color: "from-secondary to-secondary/80",
        bgColor: "bg-secondary/5",
        description: "Daily summary with date range",
        category: "analytics",
      },
      {
        id: "command_center",
        path: "command-center",
        label: "Command Center",
        icon: Activity,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-primary to-primary/80",
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
        color: "from-secondary to-secondary/80",
        bgColor: "bg-secondary/5",
        description: "Custom reports + CSV",
        category: "analytics",
      },
      {
        id: "closing_wizard",
        path: "closing-wizard",
        label: "Closing Wizard",
        icon: Lock,
        roles: ["super_admin"],
        color: "from-primary to-primary/80",
        bgColor: "bg-primary/5",
        description: "Reconcile & lock the day",
        category: "management",
      },
      {
        id: "verification_system",
        path: "verification-system",
        label: "Verification System",
        icon: ShieldCheck,
        roles: ["super_admin"],
        color: "from-primary to-primary/80",
        bgColor: "bg-primary/5",
        description: "Financial reconciliation & audit",
        category: "analytics",
      },
      {
        id: "inventory_bridge",
        path: "inventory-bridge",
        label: "Inventory Bridge",
        icon: Boxes,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-secondary to-secondary/80",
        bgColor: "bg-secondary/5",
        description: "Auto stock-out from sales",
        category: "management",
      },
      {
        id: "bi_suite",
        path: "bi-suite",
        label: "BI & Correlation Suite",
        icon: Activity,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "from-primary to-primary/80",
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
    <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubPageActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-primary-foreground hover:bg-white/10 h-10 w-10 p-0 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-white/10 h-10 w-10 p-0 rounded-full"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] p-0 border-r-0">
                <div className="bg-primary text-primary-foreground p-8">
                  <SheetHeader>
                    <SheetTitle className="text-primary-foreground text-left">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                          <User className="h-7 w-7" />
                        </div>
                        <div>
                          <div className="font-bold text-lg leading-tight">
                            {user?.name || user?.email?.split('@')[0]}
                          </div>
                          <div className="text-xs opacity-80 uppercase tracking-widest font-black mt-1">
                            {userRole?.replace("_", " ")}
                          </div>
                        </div>
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                </div>

                <div className="p-4 space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 mb-2">Actions</p>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate("/dashboard/settings");
                        setIsMenuOpen(false);
                      }}
                      className="w-full justify-start gap-4 h-14 rounded-2xl px-4 hover:bg-primary/5 active:scale-[0.98] transition-all"
                    >
                      <div className="p-2 bg-primary/10 rounded-xl text-primary"><SettingsIcon className="h-5 w-5" /></div>
                      <span className="font-bold">Settings</span>
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="w-full justify-start gap-4 h-14 rounded-2xl px-4 text-rose-600 hover:text-rose-700 hover:bg-rose-50 active:scale-[0.98] transition-all"
                    >
                      <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><LogOut className="h-5 w-5" /></div>
                      <span className="font-bold">Sign Out</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tight leading-none uppercase">
              {isSubPageActive ? currentPage?.label : "Energy Palace"}
            </h1>
            <p className="text-[10px] opacity-80 font-bold tracking-wider uppercase mt-1">
              {isSubPageActive
                ? currentPage?.description
                : "Business Nexus"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-white/10 h-10 w-10 p-0 rounded-full"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-white/10 h-10 w-10 p-0 rounded-full"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile app grid
  const MobileAppGrid = () => (
    <div className="p-4 space-y-8 dashboard-perspective">
      {Object.entries(groupedItems).map(([category, items]) => {
        const CategoryIcon = getCategoryIcon(category);
        return (
          <div key={category} className="space-y-4" style={{ transformStyle: 'preserve-3d' }}>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <CategoryIcon className="h-3.5 w-3.5" />
                {getCategoryTitle(category)}
              </div>
              <div className="h-[1px] flex-grow ml-4 bg-slate-100"></div>
            </div>
            <div className="grid grid-cols-2 gap-4" style={{ transformStyle: 'preserve-3d' }}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.id}
                    onClick={() => {
                      if ('isExternal' in item && item.isExternal) {
                        window.location.href = item.path;
                      } else {
                        navigate(item.path);
                        setIsMenuOpen(false);
                      }
                    }}
                    style={{ transform: `rotateX(${scrollTilt}deg)` }}
                    className="group cursor-pointer scroll-responsive-card press-3d border-none shadow-sm bg-white rounded-3xl overflow-hidden"
                  >
                    <CardContent className="p-5 flex flex-col items-center text-center space-y-4" style={{ transformStyle: 'preserve-3d' }}>
                      <div
                        className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform z-float-icon`}
                      >
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <div className="space-y-1 z-float-text" style={{ transformStyle: 'preserve-3d' }}>
                        <p className="font-black text-xs uppercase tracking-tight text-slate-800">
                          {item.label}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground leading-tight px-2">
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader />

      {/* Main Content */}
      <main className="pb-safe">
        {!isSubPageActive ? (
          <div className="space-y-6">
            {/* Welcome Section - Compact Row */}
            <div className="px-4 pt-4">
              <div className="bg-slate-900 rounded-2xl p-3 shadow-lg flex items-center justify-between border border-white/10 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl -mr-12 -mt-12"></div>

                <div className="flex items-center gap-3 relative z-10">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1.5px] shadow-md">
                    <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white leading-none">
                      Hello, {user?.name || user?.email?.split('@')[0]}!
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                        <span className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse"></span>
                        <span className="text-[9px] font-black text-primary uppercase tracking-tighter">Online</span>
                      </div>
                      <div className="bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          {userRole?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 text-right">
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
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
