
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Building2, 
  LogOut, 
  ShoppingCart, 
  Zap, 
  Receipt, 
  TrendingUp, 
  TrendingDown,
  PiggyBank,
  BarChart3,
  Users,
  Settings,
  Eye,
  FileSpreadsheet,
  Menu
} from 'lucide-react';
import OrdersTab from '@/components/tabs/OrdersTab';
import ChargingTab from '@/components/tabs/ChargingTab';
import ExpensesTab from '@/components/tabs/ExpensesTab';
import DepositsTab from '@/components/tabs/DepositsTab';
import WithdrawalsTab from '@/components/tabs/WithdrawalsTab';
import CooperativeSavingsTab from '@/components/tabs/CooperativeSavingsTab';
import InsightsTab from '@/components/tabs/InsightsTab';
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const { user, logout, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const dataEntryTabs = [
    { id: 'orders', label: 'Orders', icon: ShoppingCart, component: OrdersTab },
    { id: 'charging', label: 'Charging', icon: Zap, component: ChargingTab },
    { id: 'expenses', label: 'Expenses', icon: Receipt, component: ExpensesTab },
    { id: 'deposits', label: 'Deposits', icon: TrendingUp, component: DepositsTab },
    { id: 'withdrawals', label: 'Withdrawals', icon: TrendingDown, component: WithdrawalsTab },
    { id: 'cooperative', label: 'Cooperative Savings', icon: PiggyBank, component: CooperativeSavingsTab },
  ];

  const reportingTabs = [
    { id: 'insights', label: 'Business Insights', icon: BarChart3, component: InsightsTab },
    { id: 'orders-view', label: 'Orders Report', icon: Eye, component: () => <div>Orders Report Coming Soon</div> },
    { id: 'financial', label: 'Financial Dashboard', icon: TrendingUp, component: () => <div>Financial Dashboard Coming Soon</div> },
    { id: 'transactions', label: 'Transaction Reports', icon: FileSpreadsheet, component: () => <div>Transaction Reports Coming Soon</div> },
  ];

  const adminTabs = [
    { id: 'users', label: 'User Management', icon: Users, component: () => <div>User Management Coming Soon</div> },
    { id: 'settings', label: 'System Settings', icon: Settings, component: () => <div>System Settings Coming Soon</div> },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-500';
      case 'super_user': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'super_user': return 'Manager';
      default: return 'User';
    }
  };

  const availableTabs = [
    ...dataEntryTabs,
    ...(hasRole('super_user') ? reportingTabs : []),
    ...(hasRole('super_admin') ? adminTabs : [])
  ];

  const ActiveComponent = availableTabs.find(tab => tab.id === activeTab)?.component || OrdersTab;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Energy Palace Nexus Point
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">Business Management Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <Badge className={`${getRoleColor(user?.role || '')} text-white`}>
                  {getRoleLabel(user?.role || '')}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.first_name || user?.name}!
          </h2>
          <p className="text-gray-600">
            Manage your business operations from this comprehensive dashboard.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-2">
            <TabsList className="grid w-full gap-1 bg-transparent" style={{ gridTemplateColumns: `repeat(${Math.min(availableTabs.length, 6)}, 1fr)` }}>
              {availableTabs.slice(0, 6).map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            {availableTabs.length > 6 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {availableTabs.slice(6).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </div>
            )}
          </div>

          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <ActiveComponent />
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
