import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, MessageCircle, X, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ChatBotProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface DatabaseData {
  orders: any[];
  chargingSessions: any[];
  expenses: any[];
  deposits: any[];
  withdrawals: any[];
  cooperative: any[];
  menuItems: any[];
  profiles: any[];
  userRoles: any[];
  reports: any[];
  staticExpenses: any[];
  analyticsCache: any[];
}

const ChatBot = ({ isOpen, onToggle }: ChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: `🤖 **Welcome to your AI Business Intelligence Assistant!**

I have complete access to your entire database and can provide detailed insights on:

📊 **Financial Analytics:** Revenue, expenses, profit margins, cash flow
🛒 **Sales Intelligence:** Order patterns, customer behavior, product performance  
⚡ **Energy Management:** Charging sessions, usage patterns, efficiency metrics
💰 **Financial Operations:** Deposits, withdrawals, payment methods, balances
🏦 **Savings & Investments:** Cooperative savings, growth trends
👥 **User Analytics:** Customer demographics, activity patterns, role distribution
🍽️ **Menu Intelligence:** Item performance, category analysis, pricing insights
📈 **Business Intelligence:** Trends, forecasts, comparative analysis

**Try asking specific questions like:**
• "Show me daily revenue for last week"
• "Which menu items are most profitable?"
• "What's my cash flow pattern?"
• "Compare this month vs last month performance"
• "Show me customer spending patterns"

I can analyze data by time periods, categories, payment methods, and much more!`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [databaseData, setDatabaseData] = useState<DatabaseData | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Comprehensive data fetching
  const fetchAllData = async (): Promise<DatabaseData> => {
    const [
      ordersResult,
      chargingResult,
      expensesResult,
      depositsResult,
      withdrawalsResult,
      cooperativeResult,
      menuItemsResult,
      profilesResult,
      userRolesResult,
      reportsResult,
      staticExpensesResult,
      analyticsCacheResult
    ] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('charging_sessions').select('*').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('deposits').select('*').order('created_at', { ascending: false }),
      supabase.from('withdrawals').select('*').order('created_at', { ascending: false }),
      supabase.from('cooperative_savings').select('*').order('created_at', { ascending: false }),
      supabase.from('menu_items').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('static_expenses').select('*'),
      supabase.from('analytics_cache').select('*')
    ]);

    return {
      orders: ordersResult.data || [],
      chargingSessions: chargingResult.data || [],
      expenses: expensesResult.data || [],
      deposits: depositsResult.data || [],
      withdrawals: withdrawalsResult.data || [],
      cooperative: cooperativeResult.data || [],
      menuItems: menuItemsResult.data || [],
      profiles: profilesResult.data || [],
      userRoles: userRolesResult.data || [],
      reports: reportsResult.data || [],
      staticExpenses: staticExpensesResult.data || [],
      analyticsCache: analyticsCacheResult.data || []
    };
  };

  // Advanced date filtering
  const filterByDateRange = (data: any[], dateField: string, query: string) => {
    const now = new Date();
    let startDate: Date, endDate: Date;

    if (query.includes('today')) {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (query.includes('yesterday')) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
    } else if (query.includes('this week')) {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startDate = startOfWeek;
      endDate = now;
    } else if (query.includes('last week')) {
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      startDate = lastWeekStart;
      endDate = lastWeekEnd;
    } else if (query.includes('this month')) {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (query.includes('last month')) {
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
    } else if (query.includes('last 7 days')) {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      endDate = now;
    } else if (query.includes('last 30 days')) {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      endDate = now;
    } else {
      return data; // No date filter
    }

    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return isWithinInterval(itemDate, { start: startDate, end: endDate });
    });
  };

  // Advanced analytics functions
  const calculateAdvancedMetrics = (data: DatabaseData, query: string) => {
    const filteredOrders = filterByDateRange(data.orders, 'order_date', query);
    const filteredCharging = filterByDateRange(data.chargingSessions, 'session_date', query);
    const filteredExpenses = filterByDateRange(data.expenses, 'expense_date', query);
    const filteredDeposits = filterByDateRange(data.deposits, 'deposit_date', query);
    const filteredWithdrawals = filterByDateRange(data.withdrawals, 'withdrawal_date', query);
    const filteredCooperative = filterByDateRange(data.cooperative, 'contribution_date', query);

    const ordersRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const chargingRevenue = filteredCharging.reduce((sum, session) => sum + Number(session.total_amount), 0);
    const totalRevenue = ordersRevenue + chargingRevenue;
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const totalDeposits = filteredDeposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
    const totalWithdrawals = filteredWithdrawals.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0);
    const totalSavings = filteredCooperative.reduce((sum, saving) => sum + Number(saving.contribution_amount), 0);

    return {
      filteredOrders,
      filteredCharging,
      filteredExpenses,
      filteredDeposits,
      filteredWithdrawals,
      filteredCooperative,
      ordersRevenue,
      chargingRevenue,
      totalRevenue,
      totalExpenses,
      totalDeposits,
      totalWithdrawals,
      totalSavings,
      netProfit: totalRevenue - totalExpenses,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
    };
  };

  // Intelligent query processing
  const processIntelligentQuery = async (query: string, data: DatabaseData): Promise<string> => {
    const lowerQuery = query.toLowerCase();
    const metrics = calculateAdvancedMetrics(data, query);

    // Revenue and Sales Analysis
    if (lowerQuery.includes('revenue') || lowerQuery.includes('sales') || lowerQuery.includes('income')) {
      if (lowerQuery.includes('daily') || lowerQuery.includes('day')) {
        const dailyBreakdown = metrics.filteredOrders.reduce((acc, order) => {
          const date = format(new Date(order.order_date), 'yyyy-MM-dd');
          acc[date] = (acc[date] || 0) + Number(order.total);
          return acc;
        }, {} as Record<string, number>);

        const chargingDaily = metrics.filteredCharging.reduce((acc, session) => {
          const date = format(new Date(session.session_date), 'yyyy-MM-dd');
          acc[date] = (acc[date] || 0) + Number(session.total_amount);
          return acc;
        }, {} as Record<string, number>);

        const combinedDaily = Object.keys({...dailyBreakdown, ...chargingDaily}).map(date => ({
          date,
          orders: dailyBreakdown[date] || 0,
          charging: chargingDaily[date] || 0,
          total: (dailyBreakdown[date] || 0) + (chargingDaily[date] || 0)
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return `📊 **Daily Revenue Breakdown:**\n\n` +
          combinedDaily.slice(0, 10).map(day => 
            `📅 **${format(new Date(day.date), 'MMM dd, yyyy')}**\n` +
            `• Orders: NRs. ${day.orders.toLocaleString()}\n` +
            `• Charging: NRs. ${day.charging.toLocaleString()}\n` +
            `• Total: NRs. ${day.total.toLocaleString()}\n`
          ).join('\n') +
          `\n💰 **Period Total: NRs. ${metrics.totalRevenue.toLocaleString()}**`;
      }

      if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('versus')) {
        const thisMonth = calculateAdvancedMetrics(data, 'this month');
        const lastMonth = calculateAdvancedMetrics(data, 'last month');
        const growth = lastMonth.totalRevenue > 0 ? 
          ((thisMonth.totalRevenue - lastMonth.totalRevenue) / lastMonth.totalRevenue) * 100 : 0;

        return `📈 **Revenue Comparison:**\n\n` +
          `**This Month:**\n` +
          `• Orders: NRs. ${thisMonth.ordersRevenue.toLocaleString()}\n` +
          `• Charging: NRs. ${thisMonth.chargingRevenue.toLocaleString()}\n` +
          `• Total: NRs. ${thisMonth.totalRevenue.toLocaleString()}\n\n` +
          `**Last Month:**\n` +
          `• Orders: NRs. ${lastMonth.ordersRevenue.toLocaleString()}\n` +
          `• Charging: NRs. ${lastMonth.chargingRevenue.toLocaleString()}\n` +
          `• Total: NRs. ${lastMonth.totalRevenue.toLocaleString()}\n\n` +
          `📊 **Growth: ${growth > 0 ? '+' : ''}${growth.toFixed(1)}%** ${growth > 0 ? '🚀' : growth < 0 ? '📉' : '➡️'}`;
      }

      return `💰 **Revenue Analysis:**\n\n` +
        `• Orders Revenue: NRs. ${metrics.ordersRevenue.toLocaleString()}\n` +
        `• Charging Revenue: NRs. ${metrics.chargingRevenue.toLocaleString()}\n` +
        `• Total Revenue: NRs. ${metrics.totalRevenue.toLocaleString()}\n` +
        `• Average Order Value: NRs. ${metrics.filteredOrders.length > 0 ? (metrics.ordersRevenue / metrics.filteredOrders.length).toFixed(2) : '0'}\n` +
        `• Average Charging Session: NRs. ${metrics.filteredCharging.length > 0 ? (metrics.chargingRevenue / metrics.filteredCharging.length).toFixed(2) : '0'}`;
    }

    // Menu and Product Analysis
    if (lowerQuery.includes('menu') || lowerQuery.includes('product') || lowerQuery.includes('item')) {
      if (lowerQuery.includes('profitable') || lowerQuery.includes('profit')) {
        const itemProfitability = metrics.filteredOrders.reduce((acc, order) => {
          const key = order.item_name;
          if (!acc[key]) acc[key] = { revenue: 0, quantity: 0, orders: 0 };
          acc[key].revenue += Number(order.total);
          acc[key].quantity += Number(order.quantity);
          acc[key].orders += 1;
          return acc;
        }, {} as Record<string, { revenue: number; quantity: number; orders: number }>);

        const sortedItems = Object.entries(itemProfitability)
          .map(([name, data]) => ({
            name,
            ...data,
            avgOrderValue: data.revenue / data.orders,
            revenuePerUnit: data.revenue / data.quantity
          }))
          .sort((a, b) => b.revenue - a.revenue);

        return `🏆 **Most Profitable Menu Items:**\n\n` +
          sortedItems.slice(0, 10).map((item, index) => 
            `${index + 1}. **${item.name}**\n` +
            `   • Revenue: NRs. ${item.revenue.toLocaleString()}\n` +
            `   • Quantity Sold: ${item.quantity}\n` +
            `   • Orders: ${item.orders}\n` +
            `   • Avg Order Value: NRs. ${item.avgOrderValue.toFixed(2)}\n` +
            `   • Revenue/Unit: NRs. ${item.revenuePerUnit.toFixed(2)}\n`
          ).join('\n');
      }

      if (lowerQuery.includes('category') || lowerQuery.includes('categories')) {
        const categoryAnalysis = data.menuItems.reduce((acc, item) => {
          const category = item.category;
          if (!acc[category]) acc[category] = { 
            items: 0, 
            available: 0, 
            avgPrice: 0, 
            totalPrice: 0,
            revenue: 0,
            orders: 0
          };
          acc[category].items += 1;
          acc[category].available += item.is_available ? 1 : 0;
          acc[category].totalPrice += Number(item.price);
          return acc;
        }, {} as Record<string, any>);

        // Add sales data to categories
        metrics.filteredOrders.forEach(order => {
          const menuItem = data.menuItems.find(item => item.name === order.item_name);
          if (menuItem) {
            const category = menuItem.category;
            if (categoryAnalysis[category]) {
              categoryAnalysis[category].revenue += Number(order.total);
              categoryAnalysis[category].orders += 1;
            }
          }
        });

        Object.keys(categoryAnalysis).forEach(category => {
          categoryAnalysis[category].avgPrice = categoryAnalysis[category].totalPrice / categoryAnalysis[category].items;
        });

        return `🍽️ **Menu Category Analysis:**\n\n` +
          Object.entries(categoryAnalysis).map(([category, data]) => 
            `**${category}:**\n` +
            `• Items: ${data.items} (${data.available} available)\n` +
            `• Avg Price: NRs. ${data.avgPrice.toFixed(2)}\n` +
            `• Revenue: NRs. ${data.revenue.toLocaleString()}\n` +
            `• Orders: ${data.orders}\n`
          ).join('\n');
      }

      const availableItems = data.menuItems.filter(item => item.is_available);
      const unavailableItems = data.menuItems.filter(item => !item.is_available);
      const categories = [...new Set(data.menuItems.map(item => item.category))];
      const avgPrice = data.menuItems.reduce((sum, item) => sum + item.price, 0) / data.menuItems.length;

      return `📋 **Complete Menu Analysis:**\n\n` +
        `• Total Items: ${data.menuItems.length}\n` +
        `• Available: ${availableItems.length}\n` +
        `• Unavailable: ${unavailableItems.length}\n` +
        `• Categories: ${categories.length} (${categories.join(', ')})\n` +
        `• Average Price: NRs. ${avgPrice.toFixed(2)}\n` +
        `• Price Range: NRs. ${Math.min(...data.menuItems.map(i => i.price))} - NRs. ${Math.max(...data.menuItems.map(i => i.price))}\n\n` +
        `**Top Selling Items:**\n` +
        metrics.filteredOrders.reduce((acc, order) => {
          acc[order.item_name] = (acc[order.item_name] || 0) + Number(order.quantity);
          return acc;
        }, {} as Record<string, number>)
        |> Object.entries(%)
        |> %.sort(([,a], [,b]) => b - a)
        |> %.slice(0, 5)
        |> %.map(([name, qty], i) => `${i + 1}. ${name}: ${qty} units`)
        |> %.join('\n');
    }

    // Customer and User Analysis
    if (lowerQuery.includes('customer') || lowerQuery.includes('user') || lowerQuery.includes('client')) {
      if (lowerQuery.includes('spending') || lowerQuery.includes('spend')) {
        const userSpending = metrics.filteredOrders.reduce((acc, order) => {
          const userId = order.user_id;
          if (!acc[userId]) acc[userId] = { total: 0, orders: 0, items: 0 };
          acc[userId].total += Number(order.total);
          acc[userId].orders += 1;
          acc[userId].items += Number(order.quantity);
          return acc;
        }, {} as Record<string, { total: number; orders: number; items: number }>);

        const topSpenders = Object.entries(userSpending)
          .map(([userId, data]) => {
            const profile = data.profiles?.find(p => p.id === userId);
            return {
              name: profile ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email : 'Unknown',
              email: profile?.email || 'Unknown',
              ...data,
              avgOrderValue: data.total / data.orders
            };
          })
          .sort((a, b) => b.total - a.total);

        return `👑 **Top Customer Spending:**\n\n` +
          topSpenders.slice(0, 10).map((customer, index) => 
            `${index + 1}. **${customer.name}**\n` +
            `   • Total Spent: NRs. ${customer.total.toLocaleString()}\n` +
            `   • Orders: ${customer.orders}\n` +
            `   • Items Purchased: ${customer.items}\n` +
            `   • Avg Order Value: NRs. ${customer.avgOrderValue.toFixed(2)}\n`
          ).join('\n');
      }

      const roleDistribution = data.userRoles.reduce((acc, role) => {
        acc[role.role] = (acc[role.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recentUsers = data.profiles.filter(p => 
        new Date(p.created_at || '').getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
      );

      return `👥 **User Analytics:**\n\n` +
        `• Total Users: ${data.profiles.length}\n` +
        `• New Users (30 days): ${recentUsers.length}\n` +
        `• Active Customers: ${new Set(metrics.filteredOrders.map(o => o.user_id)).size}\n\n` +
        `**Role Distribution:**\n` +
        Object.entries(roleDistribution).map(([role, count]) => 
          `• ${role.replace('_', ' ')}: ${count}`
        ).join('\n');
    }

    // Expense Analysis
    if (lowerQuery.includes('expense') || lowerQuery.includes('cost') || lowerQuery.includes('spending')) {
      if (lowerQuery.includes('category') || lowerQuery.includes('breakdown')) {
        const expenseCategories = metrics.filteredExpenses.reduce((acc, expense) => {
          const category = expense.category;
          if (!acc[category]) acc[category] = { amount: 0, count: 0, avgAmount: 0 };
          acc[category].amount += Number(expense.amount);
          acc[category].count += 1;
          return acc;
        }, {} as Record<string, { amount: number; count: number; avgAmount: number }>);

        Object.keys(expenseCategories).forEach(category => {
          expenseCategories[category].avgAmount = expenseCategories[category].amount / expenseCategories[category].count;
        });

        const sortedCategories = Object.entries(expenseCategories)
          .sort(([,a], [,b]) => b.amount - a.amount);

        return `💸 **Expense Category Breakdown:**\n\n` +
          sortedCategories.map(([category, data]) => 
            `**${category}:**\n` +
            `• Total: NRs. ${data.amount.toLocaleString()}\n` +
            `• Transactions: ${data.count}\n` +
            `• Average: NRs. ${data.avgAmount.toFixed(2)}\n` +
            `• % of Total: ${((data.amount / metrics.totalExpenses) * 100).toFixed(1)}%\n`
          ).join('\n') +
          `\n💰 **Total Expenses: NRs. ${metrics.totalExpenses.toLocaleString()}**`;
      }

      const paymentModeExpenses = metrics.filteredExpenses.reduce((acc, expense) => {
        acc[expense.payment_mode] = (acc[expense.payment_mode] || 0) + Number(expense.amount);
        return acc;
      }, {} as Record<string, number>);

      return `💸 **Expense Analysis:**\n\n` +
        `• Total Expenses: NRs. ${metrics.totalExpenses.toLocaleString()}\n` +
        `• Number of Transactions: ${metrics.filteredExpenses.length}\n` +
        `• Average Expense: NRs. ${metrics.filteredExpenses.length > 0 ? (metrics.totalExpenses / metrics.filteredExpenses.length).toFixed(2) : '0'}\n\n` +
        `**Payment Methods:**\n` +
        Object.entries(paymentModeExpenses).map(([mode, amount]) => 
          `• ${mode}: NRs. ${amount.toLocaleString()}`
        ).join('\n');
    }

    // Charging Sessions Analysis
    if (lowerQuery.includes('charging') || lowerQuery.includes('energy') || lowerQuery.includes('session')) {
      if (lowerQuery.includes('efficiency') || lowerQuery.includes('performance')) {
        const sessionsWithData = metrics.filteredCharging.filter(s => 
          s.start_percentage && s.end_percentage && s.kcal
        );

        const efficiencyMetrics = sessionsWithData.map(session => ({
          ...session,
          percentageCharged: Number(session.end_percentage) - Number(session.start_percentage),
          costPerPercent: Number(session.total_amount) / (Number(session.end_percentage) - Number(session.start_percentage)),
          costPerKcal: Number(session.total_amount) / Number(session.kcal)
        }));

        const avgEfficiency = efficiencyMetrics.reduce((acc, session) => {
          acc.percentageCharged += session.percentageCharged;
          acc.costPerPercent += session.costPerPercent;
          acc.costPerKcal += session.costPerKcal;
          return acc;
        }, { percentageCharged: 0, costPerPercent: 0, costPerKcal: 0 });

        if (efficiencyMetrics.length > 0) {
          avgEfficiency.percentageCharged /= efficiencyMetrics.length;
          avgEfficiency.costPerPercent /= efficiencyMetrics.length;
          avgEfficiency.costPerKcal /= efficiencyMetrics.length;
        }

        return `⚡ **Charging Efficiency Analysis:**\n\n` +
          `• Total Sessions: ${metrics.filteredCharging.length}\n` +
          `• Sessions with Data: ${sessionsWithData.length}\n` +
          `• Total Revenue: NRs. ${metrics.chargingRevenue.toLocaleString()}\n` +
          `• Avg Session Value: NRs. ${metrics.filteredCharging.length > 0 ? (metrics.chargingRevenue / metrics.filteredCharging.length).toFixed(2) : '0'}\n\n` +
          `**Efficiency Metrics:**\n` +
          `• Avg % Charged: ${avgEfficiency.percentageCharged.toFixed(1)}%\n` +
          `• Avg Cost per %: NRs. ${avgEfficiency.costPerPercent.toFixed(2)}\n` +
          `• Avg Cost per kCal: NRs. ${avgEfficiency.costPerKcal.toFixed(2)}\n`;
      }

      const paymentMethods = metrics.filteredCharging.reduce((acc, session) => {
        acc[session.payment_mode] = (acc[session.payment_mode] || 0) + Number(session.total_amount);
        return acc;
      }, {} as Record<string, number>);

      return `⚡ **Charging Sessions Analysis:**\n\n` +
        `• Total Sessions: ${metrics.filteredCharging.length}\n` +
        `• Total Revenue: NRs. ${metrics.chargingRevenue.toLocaleString()}\n` +
        `• Average Session: NRs. ${metrics.filteredCharging.length > 0 ? (metrics.chargingRevenue / metrics.filteredCharging.length).toFixed(2) : '0'}\n\n` +
        `**Payment Methods:**\n` +
        Object.entries(paymentMethods).map(([method, amount]) => 
          `• ${method}: NRs. ${amount.toLocaleString()}`
        ).join('\n');
    }

    // Financial Health and Cash Flow
    if (lowerQuery.includes('cash flow') || lowerQuery.includes('balance') || lowerQuery.includes('financial health')) {
      const cashFlow = {
        income: metrics.totalRevenue + metrics.totalDeposits,
        outflow: metrics.totalExpenses + metrics.totalWithdrawals,
        netFlow: (metrics.totalRevenue + metrics.totalDeposits) - (metrics.totalExpenses + metrics.totalWithdrawals)
      };

      const paymentMethodBalance = [...metrics.filteredOrders, ...metrics.filteredCharging].reduce((acc, transaction) => {
        const mode = transaction.payment_mode;
        const amount = Number(transaction.total || transaction.total_amount);
        acc[mode] = (acc[mode] || 0) + amount;
        return acc;
      }, {} as Record<string, number>);

      metrics.filteredExpenses.forEach(expense => {
        const mode = expense.payment_mode;
        paymentMethodBalance[mode] = (paymentMethodBalance[mode] || 0) - Number(expense.amount);
      });

      return `💰 **Financial Health Analysis:**\n\n` +
        `**Cash Flow:**\n` +
        `• Total Inflow: NRs. ${cashFlow.income.toLocaleString()}\n` +
        `• Total Outflow: NRs. ${cashFlow.outflow.toLocaleString()}\n` +
        `• Net Cash Flow: NRs. ${cashFlow.netFlow.toLocaleString()} ${cashFlow.netFlow > 0 ? '✅' : '⚠️'}\n\n` +
        `**Profitability:**\n` +
        `• Revenue: NRs. ${metrics.totalRevenue.toLocaleString()}\n` +
        `• Expenses: NRs. ${metrics.totalExpenses.toLocaleString()}\n` +
        `• Net Profit: NRs. ${metrics.netProfit.toLocaleString()}\n` +
        `• Profit Margin: ${metrics.profitMargin.toFixed(1)}%\n\n` +
        `**Payment Method Balances:**\n` +
        Object.entries(paymentMethodBalance).map(([method, balance]) => 
          `• ${method}: NRs. ${balance.toLocaleString()} ${balance > 0 ? '✅' : balance < 0 ? '⚠️' : '➡️'}`
        ).join('\n');
    }

    // Trends and Patterns
    if (lowerQuery.includes('trend') || lowerQuery.includes('pattern') || lowerQuery.includes('growth')) {
      const monthlyData = {};
      const currentDate = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthKey = format(month, 'yyyy-MM');
        const monthName = format(month, 'MMM yyyy');
        
        const monthOrders = data.orders.filter(order => 
          order.order_date && order.order_date.startsWith(monthKey)
        );
        const monthCharging = data.chargingSessions.filter(session => 
          session.session_date && session.session_date.startsWith(monthKey)
        );
        const monthExpenses = data.expenses.filter(expense => 
          expense.expense_date && expense.expense_date.startsWith(monthKey)
        );

        monthlyData[monthName] = {
          revenue: monthOrders.reduce((sum, o) => sum + Number(o.total), 0) + 
                  monthCharging.reduce((sum, c) => sum + Number(c.total_amount), 0),
          expenses: monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
          orders: monthOrders.length,
          sessions: monthCharging.length
        };
      }

      return `📈 **6-Month Trend Analysis:**\n\n` +
        Object.entries(monthlyData).map(([month, data]) => 
          `**${month}:**\n` +
          `• Revenue: NRs. ${data.revenue.toLocaleString()}\n` +
          `• Expenses: NRs. ${data.expenses.toLocaleString()}\n` +
          `• Profit: NRs. ${(data.revenue - data.expenses).toLocaleString()}\n` +
          `• Orders: ${data.orders} | Sessions: ${data.sessions}\n`
        ).join('\n');
    }

    // Default comprehensive overview
    return `📊 **Comprehensive Business Intelligence:**\n\n` +
      `**Financial Overview:**\n` +
      `• Revenue: NRs. ${metrics.totalRevenue.toLocaleString()}\n` +
      `• Expenses: NRs. ${metrics.totalExpenses.toLocaleString()}\n` +
      `• Net Profit: NRs. ${metrics.netProfit.toLocaleString()}\n` +
      `• Profit Margin: ${metrics.profitMargin.toFixed(1)}%\n\n` +
      `**Operations:**\n` +
      `• Orders: ${metrics.filteredOrders.length}\n` +
      `• Charging Sessions: ${metrics.filteredCharging.length}\n` +
      `• Menu Items: ${data.menuItems.length}\n` +
      `• Active Users: ${data.profiles.length}\n\n` +
      `**Quick Insights:**\n` +
      `• Avg Order Value: NRs. ${metrics.filteredOrders.length > 0 ? (metrics.ordersRevenue / metrics.filteredOrders.length).toFixed(2) : '0'}\n` +
      `• Top Expense Category: ${metrics.filteredExpenses.length > 0 ? 
        Object.entries(metrics.filteredExpenses.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
          return acc;
        }, {})).sort(([,a], [,b]) => b - a)[0][0] : 'N/A'}\n` +
      `• Cash Flow: ${metrics.totalRevenue - metrics.totalExpenses > 0 ? 'Positive ✅' : 'Negative ⚠️'}\n\n` +
      `💡 **Ask me for specific analysis like:**\n` +
      `• "Show daily revenue trends"\n` +
      `• "Which items are most profitable?"\n` +
      `• "Compare this month vs last month"\n` +
      `• "Show customer spending patterns"`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      // Fetch fresh data for each query to ensure accuracy
      const data = await fetchAllData();
      setDatabaseData(data);

      const botResponse = await processIntelligentQuery(currentInput, data);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error processing query:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '❌ **Error Processing Request**\n\nI encountered an error while analyzing your data. This could be due to:\n\n• Database connectivity issues\n• Complex query processing\n• Temporary system overload\n\nPlease try rephrasing your question or contact support if the issue persists.\n\n💡 **Try asking simpler questions like:**\n• "Show me today\'s revenue"\n• "How many orders today?"\n• "What are my expenses?"',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "Error",
        description: "Failed to process your query. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] shadow-2xl z-50 flex flex-col border-2 border-blue-200">
      <CardHeader className="pb-3 flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle className="text-lg">AI Business Intelligence</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onToggle} className="text-white hover:bg-white/20">
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggle} className="text-white hover:bg-white/20">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 pt-0 min-h-0">
        <ScrollArea className="flex-1 pr-3" ref={scrollAreaRef}>
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto'
                      : 'bg-gray-100 border'
                  }`}
                  style={{ 
                    wordWrap: 'break-word', 
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                    hyphens: 'auto'
                  }}
                >
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                </div>
                
                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 border rounded-lg px-3 py-2 text-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <span className="ml-2 text-gray-600">Analyzing your data...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex gap-2 mt-4 flex-shrink-0">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything about your business data..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatBot;