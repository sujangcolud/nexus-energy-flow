import React, { useState, useEffect } from "react";
import EnhancedChatBot from "@/components/AIAnalystChat";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { setupGlobalErrorHandler } from "./utils/supabaseErrorHandler";
import { setupGlobalAuthErrorHandler } from "./utils/globalErrorHandler";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard"; // Will serve as layout
import ProtectedRoute from "./components/ProtectedRoute";

// Import Tab Components for Routing
import OrdersTab from "./components/tabs/OrdersTab";
import ChargingTab from "./components/tabs/ChargingTab";
import ExpensesTab from "./components/tabs/ExpensesTab";
import DepositsTab from "./components/tabs/DepositsTab";
import WithdrawalsTab from "./components/tabs/WithdrawalsTab";
import SavingsWithdrawalsTab from "./components/tabs/SavingsWithdrawalsTab";
import MenuManagementTab from "./components/tabs/MenuManagementTab"; // Consider admin roles for this route

import DataInputTab from "./components/tabs/DataInputTab";
import UserManagementTab from "./components/tabs/UserManagementTab";
import ShareInvestmentsTab from "./components/tabs/ShareInvestmentsTab";
import ExpenseBookingsTab from "./components/tabs/ExpenseBookingsTab";
import VATEntryTab from "./components/tabs/VATEntryTab";
import InventoryTab from "./components/tabs/InventoryTab";
import FileUploadTab from "./components/tabs/FileUploadTab";

import UnifiedInsightsTab from "./components/tabs/UnifiedInsightsTab";
import UnifiedBulkImportTab from "./components/tabs/UnifiedBulkImportTab";

import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import AdminPanel from "./pages/AdminPanel";
import CustomReportCreator from "./pages/CustomReportCreator";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import DashboardStudioPage from "./pages/DashboardStudio";
import DailySummaryReport from "./pages/DailySummaryReport";
import CommandCenterTab from "./components/tabs/CommandCenterTab";
import DailyClosingWizardTab from "./components/tabs/DailyClosingWizardTab";
import CustomReportBuilderTab from "./components/tabs/CustomReportBuilderTab";
import InventoryBridgeTab from "./components/tabs/InventoryBridgeTab";
import BusinessIntelligenceSuite from "./components/tabs/BusinessIntelligenceSuite";
import { Outlet } from "react-router-dom"; // Needed for nested routes

const queryClient = new QueryClient();

// Define a DashboardLayout component that includes the Outlet for nested routes
// This might be similar to the current Dashboard component but will now include <Outlet />
// For now, we assume Dashboard.tsx itself will be modified to include <Outlet />
// and the main content of Dashboard (the cards) will be on an index route or part of the layout.

// A component to represent the main dashboard view with cards, if we make it an index route.
// For simplicity, Dashboard.tsx will handle its own content (cards) + Outlet for now.
// const DashboardHomePage = () => <div>Dashboard Home - Cards Here</div>;

const ChatBotWrapper = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isChatBotOpen, setChatBotOpen] = useState(false);

  const handleToggleChatBot = () => {
    setChatBotOpen((prev) => !prev);
  };

  // Only show chatbot if user is logged in and not on login page
  const shouldShowChatBot = user && location.pathname !== "/";

  if (!shouldShowChatBot) {
    return null;
  }

  return (
    <EnhancedChatBot
      isOpen={isChatBotOpen}
      onToggle={handleToggleChatBot}
    />
  );
};

const App = () => {
  // Set up global error handler for refresh token errors
  useEffect(() => {
    setupGlobalErrorHandler();
    setupGlobalAuthErrorHandler();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route
                path="/poss"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="/poss/*"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />{" "}
                    {/* Dashboard now acts as a layout component */}
                  </ProtectedRoute>
                }
              >
                {/* Index route for /dashboard to show cards or default content */}
                {/* For now, Dashboard component itself will decide to show cards or Outlet content */}
                {/* If cards are always visible WITH page content, Dashboard handles that. */}
                {/* If cards are ONLY on /dashboard and specific content on /dashboard/subpath, then an index route is better. */}
                {/* Let's assume Dashboard will render cards if no child route matches, or always render cards above <Outlet /> */}

                {/* Child routes for dashboard sections */}
                <Route path="orders" element={<OrdersTab />} />
                <Route path="charging" element={<ChargingTab />} />
                <Route path="expenses" element={<ExpensesTab />} />
                <Route path="deposits" element={<DepositsTab />} />
                <Route path="withdrawals" element={<SavingsWithdrawalsTab />} />
                <Route
                  path="share-investments"
                  element={<ShareInvestmentsTab />}
                />
                <Route
                  path="expense-bookings"
                  element={<ExpenseBookingsTab />}
                />
                <Route path="vat-entry" element={<VATEntryTab />} />
                <Route path="inventory" element={<InventoryTab />} />
                {/* TODO: Add role-based protection for menu if needed at route level, or handle in MenuManagementTab */}
                <Route path="menu" element={<MenuManagementTab />} />

                <Route path="bulk-import" element={<UnifiedBulkImportTab />} />
                <Route path="user-management" element={<UserManagementTab />} />

                <Route
                  path="super-admin"
                  element={
                    <ProtectedRoute allowedRoles={["super_admin"]}>
                      <SuperAdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="settings" element={<Settings />} />
                <Route
                  path="dashboard-studio"
                  element={<DashboardStudioPage />}
                />
                <Route
                  path="daily-summary-report"
                  element={<DailySummaryReport />}
                />
                <Route path="command-center" element={<CommandCenterTab />} />
                <Route path="closing-wizard" element={<DailyClosingWizardTab />} />
                <Route path="report-builder" element={<CustomReportBuilderTab />} />
                <Route path="inventory-bridge" element={<InventoryBridgeTab />} />
                <Route path="bi-suite" element={<BusinessIntelligenceSuite />} />
                {/* It might be good to have an index route that explicitly shows the cards */}
                {/* <Route index element={<DashboardPageWithCards />} /> */}
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
                        <ChatBotWrapper />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
