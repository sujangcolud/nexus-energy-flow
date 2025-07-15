import React, { useState } from "react";
import ChatBot from "@/components/ChatBot";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import TestComponent from "./components/TestComponent";
import SimpleLogin from "./components/SimpleLogin";

// Import Tab Components for Routing
import OrdersTab from "./components/tabs/OrdersTab";
import ChargingTab from "./components/tabs/ChargingTab";
import ExpensesTab from "./components/tabs/ExpensesTab";
import DepositsTab from "./components/tabs/DepositsTab";
import WithdrawalsTab from "./components/tabs/WithdrawalsTab";
import CooperativeSavingsTab from "./components/tabs/CooperativeSavingsTab";
import MenuManagementTab from "./components/tabs/MenuManagementTab";
import InsightsTab from "./components/tabs/InsightsTab";
import CombinedReportsTab from "./components/tabs/CombinedReportsTab";
import DataInputTab from "./components/tabs/DataInputTab";
import UserManagementTab from "./components/tabs/UserManagementTab";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

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
        <BrowserRouter basename="/poss">
          <AuthProvider>
            <Routes>
              <Route path="/test" element={<TestComponent />} />
              <Route path="/simple" element={<SimpleLogin />} />
              <Route path="/" element={<SimpleLogin />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              >
                <Route path="orders" element={<OrdersTab />} />
                <Route path="charging" element={<ChargingTab />} />
                <Route path="expenses" element={<ExpensesTab />} />
                <Route path="deposits" element={<DepositsTab />} />
                <Route path="withdrawals" element={<WithdrawalsTab />} />
                <Route path="cooperative" element={<CooperativeSavingsTab />} />
                <Route path="menu" element={<MenuManagementTab />} />
                <Route path="insights" element={<InsightsTab />} />
                <Route path="reports" element={<CombinedReportsTab />} />
                <Route path="data-input" element={<DataInputTab />} />
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
