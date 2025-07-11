import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, User, ShoppingCart, Zap, Receipt, CreditCard, Banknote, Users, BarChart3, FileText, UtensilsCrossed, Upload } from 'lucide-react';
import OrdersTab from '@/components/tabs/OrdersTab';
import ChargingTab from '@/components/tabs/ChargingTab';
import ExpensesTab from '@/components/tabs/ExpensesTab';
import DepositsTab from '@/components/tabs/DepositsTab';
import WithdrawalsTab from '@/components/tabs/WithdrawalsTab';
import CooperativeSavingsTab from '@/components/tabs/CooperativeSavingsTab';
import InsightsTab from '@/components/tabs/InsightsTab';
import ReportsTab from '@/components/tabs/ReportsTab';
import ReportsViewTab from '@/components/tabs/ReportsViewTab';
import MenuManagementTab from '@/components/tabs/MenuManagementTab';
import FileUploadTab from '@/components/tabs/FileUploadTab';

const Dashboard = () => {
  const { user, signOut, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Define tabs based on user role
  const getTabs = () => {
    const baseTabs = [
      { id: 'orders', label: 'Orders', icon: ShoppingCart, component: OrdersTab },
      { id: 'charging', label: 'Charging', icon: Zap, component: ChargingTab },
      { id: 'expenses', label: 'Expenses', icon: Receipt, component: ExpensesTab },
      { id: 'deposits', label: 'Deposits', icon: CreditCard, component: DepositsTab },
      { id: 'withdrawals', label: 'Withdrawals', icon: Banknote, component: WithdrawalsTab },
      { id: 'cooperative', label: 'Savings', icon: Users, component: CooperativeSavingsTab },
    ];

    const adminTabs = [
      { id: 'menu', label: 'Menu', icon: UtensilsCrossed, component: MenuManagementTab },
    ];

    const analyticsTab = [
      { id: 'insights', label: 'Analytics', icon: BarChart3, component: InsightsTab },
      { id: 'reports', label: 'Reports', icon: FileText, component: ReportsTab },
      { id: 'reports-view', label: 'View Reports', icon: FileText, component: ReportsViewTab },
      { id: 'upload', label: 'Upload', icon: Upload, component: FileUploadTab },
    ];

    // All users get base tabs and analytics
    let tabs = [...baseTabs, ...analyticsTab];

    // Super admins get menu management
    if (userRole === 'super_admin') {
      tabs = [...baseTabs, ...adminTabs, ...analyticsTab];
    }

    return tabs;
  };

  const tabs = getTabs();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EcoSoft Pro</h1>
                <p className="text-sm text-gray-500">Business Management System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
                {userRole && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                    {userRole}
                  </span>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-1 mb-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((tab) => {
            const Component = tab.component;
            return (
              <TabsContent key={tab.id} value={tab.id} className="mt-6">
                <Component />
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
