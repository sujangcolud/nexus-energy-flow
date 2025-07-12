
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Outlet, useLocation, NavLink } from 'react-router-dom'; // Import NavLink instead of Link for active styling
import { LogOut, User, ShoppingCart, Zap, Receipt, CreditCard, Banknote, Users, BarChart3, FileText, UtensilsCrossed, Database } from 'lucide-react';

// Tab components are now rendered by routes, but their types/icons might be needed for nav items.
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
  const location = useLocation(); // To determine if we are on a sub-page

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Define items for navigation cards. 'path' will be used for <Link>
  // The 'component' property is no longer used here for rendering, but kept for consistency or future use.
  const getNavItems = () => {
    const baseItems = [
      { id: 'orders', path: 'orders', label: 'Orders', icon: ShoppingCart, component: OrdersTab },
      { id: 'charging', path: 'charging', label: 'Charging', icon: Zap, component: ChargingTab },
      { id: 'expenses', path: 'expenses', label: 'Expenses', icon: Receipt, component: ExpensesTab },
      { id: 'deposits', path: 'deposits', label: 'Deposits', icon: CreditCard, component: DepositsTab },
      { id: 'withdrawals', path: 'withdrawals', label: 'Withdrawals', icon: Banknote, component: WithdrawalsTab },
      { id: 'cooperative', path: 'cooperative', label: 'Savings', icon: Users, component: CooperativeSavingsTab },
    ];

    const adminItems = [
      { id: 'menu', path: 'menu', label: 'Menu', icon: UtensilsCrossed, component: MenuManagementTab },
    ];

    const analyticsItems = [
      { id: 'insights', path: 'insights', label: 'Analytics', icon: BarChart3, component: InsightsTab },
      { id: 'reports', path: 'reports', label: 'Reports', icon: FileText, component: ReportsTab },
      { id: 'reports-view', path: 'reports-view', label: 'View Reports', icon: FileText, component: ReportsViewTab },
      { id: 'data-input', path: 'data-input', label: 'Data Input', icon: Database, component: DataInputTab },
    ];

    let items = [...baseItems, ...analyticsItems];
    if (userRole === 'super_admin') {
      items = [...baseItems, ...adminItems, ...analyticsItems];
    }
    return items;
  };

  const navItems = getNavItems();

  // Determine if a sub-page is active. A more robust way might be to check against specific paths.
  // For now, if pathname is not just "/dashboard" or "/dashboard/", it's a sub-page.
  const isSubPageActive = location.pathname !== '/dashboard' && location.pathname !== '/dashboard/';

  // Find current page title for mobile view
  const currentPage = navItems.find(item => location.pathname.includes(`/dashboard/${item.path}`));
  const currentPageTitle = currentPage?.label || 'Dashboard';


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card shadow-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <NavLink to="/dashboard" end className={({ isActive }) =>
                `flex items-center gap-3 group ${isActive ? 'cursor-default' : ''}`
              }>
                {({ isActive }) => (
                  <>
                    <div className={`p-2 rounded-lg shadow-sm transition-all group-hover:shadow-md ${isActive ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground'}`}> {/* Keep logo bg consistent or style if needed */}
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                      <h1 className={`text-xl font-bold transition-colors ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>EcoSoft Pro</h1>
                      <p className="text-sm text-gray-500">Business Management System</p>
                    </div>
                  </>
                )}
              </NavLink>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
                {userRole && (
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
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
        {/* Mobile-only active page title */}
        {isSubPageActive && (
          <div className="sm:hidden mb-4 text-center">
            <h2 className="text-lg font-semibold text-gray-800">
              {currentPageTitle}
            </h2>
          </div>
        )}

        {/* Show navigation cards only on the main /dashboard path */}
        {!isSubPageActive ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Active state for cards is not strictly needed if they only show on the base dashboard page
              // However, if we wanted to highlight the "Dashboard" link itself in a global nav, this logic would be elsewhere.
              // For now, cards don't have an "active" state themselves, they are pure navigation triggers.
              return (
                <Link key={item.id} to={item.path} className="block group">
                  <Card
                    className={`cursor-pointer transition-all duration-200 ease-in-out hover:shadow-xl hover:scale-105 bg-card hover:bg-accent/50 h-full`}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-4 h-full">
                      <div className={`p-3.5 rounded-full transition-colors duration-200 ease-in-out bg-accent group-hover:bg-primary/10 text-primary`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <p className={`text-center font-semibold transition-colors duration-200 ease-in-out text-foreground group-hover:text-primary`}>
                        {item.label}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          // If on a sub-page, render the sub-page's content via Outlet
          <Outlet />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
