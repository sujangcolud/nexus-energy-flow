
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, User, ShoppingCart, Zap, Receipt, CreditCard, Banknote, Users, BarChart3, FileText, UtensilsCrossed, Database } from 'lucide-react';
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
import DataInputTab from '@/components/tabs/DataInputTab';

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
      { id: 'data-input', label: 'Data Input', icon: Database, component: DataInputTab },
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
    <div className="min-h-screen bg-background text-foreground"> {/* Use CSS variables for background and text */}
      {/* Header */}
      <header className="bg-card shadow-md border-b border-border"> {/* Use card for header bg, add shadow and border */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-sm"> {/* Use primary color */}
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">EcoSoft Pro</h1> {/* Use foreground color */}
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
        {/* Mobile-only active tab title */}
        <div className="sm:hidden mb-4 text-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {tabs.find(tab => tab.id === activeTab)?.label}
          </h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* New Card-based Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Card
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`cursor-pointer transition-all duration-200 ease-in-out hover:shadow-xl hover:scale-105 group
                              ${activeTab === tab.id
                                ? 'ring-2 ring-primary shadow-lg scale-105 bg-accent'
                                : 'bg-card hover:bg-accent/50'}`}
                >
                  <CardContent className="flex flex-col items-center justify-center p-6 space-y-4"> {/* Increased space-y */}
                    <div className={`p-3.5 rounded-full transition-colors duration-200 ease-in-out
                                     ${activeTab === tab.id
                                       ? 'bg-primary text-primary-foreground'
                                       : 'bg-accent group-hover:bg-primary/10 text-primary'}`}>
                      <Icon className="h-7 w-7" /> {/* Slightly smaller icon for better padding feel */}
                    </div>
                    <p className={`text-center font-semibold transition-colors duration-200 ease-in-out
                                     ${activeTab === tab.id
                                       ? 'text-primary'
                                       : 'text-foreground group-hover:text-primary'}`}>
                      {tab.label}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Original TabsList can be removed or hidden as navigation is now card-based */}
          <TabsList className="hidden"> {/* Hide the original TabsList */}
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
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
