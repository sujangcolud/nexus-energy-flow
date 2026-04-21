import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Trash,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import EnhancedChatBot from "@/components/EnhancedChatBot";
import MobileDashboard from "./MobileDashboard";
import FinancialSummaryWidget from "@/components/FinancialSummaryWidget";
import AllTimeSummaryWidget from "@/components/AllTimeSummaryWidget";
import { DailyClosingSystem } from "@/components/DailyClosingSystem";
import BatchDailyClosingSystem from "@/components/BatchDailyClosingSystem";

// Tab components are now rendered by routes, but their types/icons might be needed for nav items.
import OrdersTab from "@/components/tabs/OrdersTab";
import ChargingTab from "@/components/tabs/ChargingTab";
import ExpensesTab from "@/components/tabs/ExpensesTab";
import DepositsTab from "@/components/tabs/DepositsTab";
import WithdrawalsTab from "@/components/tabs/WithdrawalsTab";
import SavingsWithdrawalsTab from "@/components/tabs/SavingsWithdrawalsTab";

import MenuManagementTab from "@/components/tabs/MenuManagementTab";
import DataInputTab from "@/components/tabs/DataInputTab";
import UserManagementTab from "@/components/tabs/UserManagementTab";
import ShareInvestmentsTab from "@/components/tabs/ShareInvestmentsTab";
import ExpenseBookingsTab from "@/components/tabs/ExpenseBookingsTab";
import VATEntryTab from "@/components/tabs/VATEntryTab";
import InventoryTab from "@/components/tabs/InventoryTab";
import FileUploadTab from "@/components/tabs/FileUploadTab";

const Dashboard = () => {
  const { user, signOut, userRole } = useAuth();
  const { hasTabAccess } = useUserPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isChatBotOpen, setIsChatBotOpen] = useState(false);
  const [canDeleteTabs, setCanDeleteTabs] = useState(false);
  const [tabSettings, setTabSettings] = useState<Record<string, boolean>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<string | null>(null);
  const [isDailyClosingOpen, setIsDailyClosingOpen] = useState(false);
  const [isBatchClosingOpen, setIsBatchClosingOpen] = useState(false);
  const [showBatchClosing, setShowBatchClosing] = useState(true);

  useEffect(() => {
    const storedSettings = localStorage.getItem("tabSettings");
    if (storedSettings) {
      setTabSettings(JSON.parse(storedSettings));
    }
    const canDelete = JSON.parse(
      localStorage.getItem("canDeleteTabs") || "false",
    );
    setCanDeleteTabs(canDelete);

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

  // Define role-based navigation items with clean neutral color schemes
  const getNavItems = () => {
    const allItems = [
      // Data Entry - accessible to all users for broader access
      {
        id: "orders",
        path: "orders",
        label: "Orders",
        icon: ShoppingCart,
        component: OrdersTab,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Manage food orders",
      },
      {
        id: "charging",
        path: "charging",
        label: "Charging",
        icon: Zap,
        component: ChargingTab,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Track energy consumption",
      },
      {
        id: "expenses",
        path: "expenses",
        label: "Expenses",
        icon: Receipt,
        component: ExpensesTab,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Monitor business expenses",
      },
      {
        id: "deposits",
        path: "deposits",
        label: "Deposits",
        icon: CreditCard,
        component: DepositsTab,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Handle financial deposits",
      },
      {
        id: "withdrawals",
        path: "withdrawals",
        label: "Savings & Withdrawals",
        icon: Banknote,
        component: SavingsWithdrawalsTab,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Manage savings and withdrawals",
      },
      {
        id: "share_investments",
        path: "share-investments",
        label: "Share Investments",
        icon: TrendingUp,
        component: ShareInvestmentsTab,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Manage share investments",
      },

      {
        id: "inventory",
        path: "inventory",
        label: "Inventory",
        icon: Package,
        component: InventoryTab,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Inventory tracking and management",
      },
      // Unified tabs - accessible to appropriate users

      {
        id: "bulk_import",
        path: "bulk-import",
        label: "Bulk Import",
        icon: Upload,
        roles: ["reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Data import & file upload",
      },
      {
        id: "menu",
        path: "menu",
        label: "Menu Setup",
        icon: UtensilsCrossed,
        component: MenuManagementTab,
        roles: ["super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Manage menu items",
      },
      {
        id: "user_management",
        path: "user-management",
        label: "User Control",
        icon: UserCog,
        component: UserManagementTab,
        roles: ["super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Manage users & permissions",
      },
      {
        id: "expense_bookings",
        path: "expense-bookings",
        label: "Expense Bookings",
        icon: FileText,
        component: ExpenseBookingsTab,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Manage expense bookings",
      },
      {
        id: "vat_entry",
        path: "vat-entry",
        label: "VAT Entry",
        icon: FileText,
        component: VATEntryTab,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Manage VAT entries",
      },
      {
        id: "dashboard_studio",
        path: "dashboard-studio",
        label: "Dashboard Studio",
        icon: BarChart3,
        roles: ["user", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Create custom dashboards with drag-and-drop",
      },
      {
        id: "daily_summary_report",
        path: "daily-summary-report",
        label: "Daily Summary Report",
        icon: FileText,
        roles: ["user", "data_entry", "reports_viewer", "super_admin"],
        color: "bg-foreground",
        bgColor: "bg-muted",
        description: "Daily summary data with date range filter",
      },
    ];

    if (!userRole) return [];

    const storedSettings = localStorage.getItem("tabSettings");
    const tabSettings = storedSettings ? JSON.parse(storedSettings) : {};

    const showOrders = JSON.parse(localStorage.getItem("showOrders") || "true");

    const showDataInput = JSON.parse(
      localStorage.getItem("showDataInput") || "true",
    );
    const showUserManagement = JSON.parse(
      localStorage.getItem("showUserManagement") || "true",
    );
    const showAdminPanel = JSON.parse(
      localStorage.getItem("showAdminPanel") || "true",
    );
    const showShareInvestments = JSON.parse(
      localStorage.getItem("showShareInvestments") || "true",
    );
    const showVatEntry = JSON.parse(
      localStorage.getItem("showVatEntry") || "true",
    );

    const tabVisibility: Record<string, boolean> = {
      orders: showOrders,
      "data-input": showDataInput,
      "user-management": showUserManagement,
      "admin-panel": showAdminPanel,
      "share-investments": showShareInvestments,
      "vat-entry": showVatEntry,
    };

    // Show all items to all users (role restrictions removed as requested)
    return allItems.filter((item) => tabSettings[item.id] ?? true);
  };

  const navItems = getNavItems();

  // Use mobile dashboard on mobile devices (after all hooks)
  if (isMobile) {
    return <MobileDashboard />;
  }

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              {isSubPageActive && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 group ${isActive ? "cursor-default" : ""}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="p-2 rounded-md bg-primary text-primary-foreground">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <h1
                        className={`text-lg font-semibold transition-colors ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                      >
                        EcoSoft Pro
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        Business Management
                      </p>
                    </div>
                  </>
                )}
              </NavLink>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <div className="p-1.5 rounded-full bg-muted">
                  <User className="h-3 w-3" />
                </div>
                <span className="font-medium text-foreground">{user?.email}</span>
                {userRole && (
                  <span className="bg-muted px-2 py-0.5 rounded text-xs font-medium border border-border">
                    {userRole.replace("_", " ")}
                  </span>
                )}
              </div>

              <Button variant="outline" size="icon" className="h-8 w-8">
                <Bell className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDailyClosing}
                className="h-8 text-xs"
              >
                <Database className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Daily Closing</span>
                <span className="sm:hidden">Daily</span>
              </Button>
              {showBatchClosing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBatchClosingOpen(true)}
                  className="h-8 text-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Batch</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="h-8 text-xs"
              >
                <LogOut className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>

              <Link to="settings">
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile-only active page title */}
        {isSubPageActive && (
          <div className="sm:hidden mb-4 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {currentPageTitle}
            </h2>
          </div>
        )}

        {/* Show navigation cards only on the main /dashboard path */}
        {!isSubPageActive ? (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Welcome back, {user?.name || "User"}
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Choose a module below to manage your business operations
              </p>
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className="relative cursor-pointer transition-all duration-200 hover:shadow-md bg-card border border-border h-full group"
                  >
                    {canDeleteTabs && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTabToDelete(item.id);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
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
                );
              })}
            </div>

            {/* Financial Summary Widget */}
            <FinancialSummaryWidget className="mb-8" />

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

            {/* All-Time Summary Widget */}
            <AllTimeSummaryWidget className="my-8" />
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Enhanced ChatBot Component */}
      <EnhancedChatBot
        isOpen={isChatBotOpen}
        onToggle={() => setIsChatBotOpen(!isChatBotOpen)}
      />

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
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this tab?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tab
              from your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (tabToDelete) {
                  const newSettings = {
                    ...tabSettings,
                    [tabToDelete]: false,
                  };
                  localStorage.setItem(
                    "tabSettings",
                    JSON.stringify(newSettings),
                  );
                  window.location.reload();
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
