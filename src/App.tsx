import React, { useState } from "react";
import ChatBot from "@/components/ChatBot";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
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
import CooperativeSavingsTab from "./components/tabs/CooperativeSavingsTab";
import MenuManagementTab from "./components/tabs/MenuManagementTab"; // Consider admin roles for this route
import InsightsTab from "./components/tabs/InsightsTab";
import ReportsViewTab from "./components/tabs/ReportsViewTab";
import AdminPanel from "./pages/AdminPanel";
import DataInputTab from "./components/tabs/DataInputTab";
import UserManagementTab from "./components/tabs/UserManagementTab";
import ShareInvestmentsTab from "./components/tabs/ShareInvestmentsTab";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import ExpenseBookingsTab from "./components/tabs/ExpenseBookingsTab";
import VatEntryTab from "./components/tabs/VatEntryTab";
import CustomReportCreator from "./pages/CustomReportCreator";
import { Outlet } from "react-router-dom"; // Needed for nested routes

const queryClient = new QueryClient();

// Define a DashboardLayout component that includes the Outlet for nested routes
// This might be similar to the current Dashboard component but will now include <Outlet />
// For now, we assume Dashboard.tsx itself will be modified to include <Outlet />
// and the main content of Dashboard (the cards) will be on an index route or part of the layout.

// A component to represent the main dashboard view with cards, if we make it an index route.
// For simplicity, Dashboard.tsx will handle its own content (cards) + Outlet for now.
// const DashboardHomePage = () => <div>Dashboard Home - Cards Here</div>;

const App = () => {
  const [isChatBotOpen, setChatBotOpen] = useState(false);

  const handleToggleChatBot = () => {
    setChatBotOpen((prev) => !prev);
  };

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
                <Route path="withdrawals" element={<WithdrawalsTab />} />
                <Route path="cooperative" element={<CooperativeSavingsTab />} />
                <Route
                  path="share-investments"
                  element={<ShareInvestmentsTab />}
                />
                {/* TODO: Add role-based protection for menu if needed at route level, or handle in MenuManagementTab */}
                <Route path="menu" element={<MenuManagementTab />} />
                <Route path="insights" element={<InsightsTab />} />
                <Route path="admin-panel" element={<AdminPanel />} />
                <Route path="reports-view" element={<ReportsViewTab />} />
                <Route path="data-input" element={<DataInputTab />} />
                <Route path="analytics" element={<Analytics />} />
                <Route
                  path="super-admin"
                  element={
                    <ProtectedRoute allowedRoles={["super_admin"]}>
                      <SuperAdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute allowedRoles={["super_admin"]}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="expense-bookings"
                  element={<ExpenseBookingsTab />}
                />
                <Route path="vat-entry" element={<VatEntryTab />} />
                <Route path="custom-reports/create" element={<CustomReportCreator />} />
                {/* It might be good to have an index route that explicitly shows the cards */}
                {/* <Route index element={<DashboardPageWithCards />} /> */}
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        <ChatBot isOpen={isChatBotOpen} onToggle={handleToggleChatBot} />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
