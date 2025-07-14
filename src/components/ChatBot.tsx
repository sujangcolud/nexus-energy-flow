import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, MessageCircle, X, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

const ChatBot = ({ isOpen, onToggle }: ChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your business assistant. I can help you with analytics, reports, and answer questions about your business data. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

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
      let botResponse = '';

      // Enhanced keyword detection for comprehensive data queries
      const businessKeywords = [
        'sales', 'revenue', 'orders', 'expenses', 'analytics', 'report', 'data', 'profit', 'loss',
        'charging', 'sessions', 'deposits', 'withdrawals', 'savings', 'cooperative', 'menu',
        'items', 'users', 'customers', 'payments', 'cash', 'esewa', 'fonepay', 'bank',
        'categories', 'breakdown', 'summary', 'total', 'average', 'monthly', 'daily',
        'trends', 'growth', 'performance', 'balance', 'transactions'
      ];

      const isBusinessQuery = businessKeywords.some(keyword => 
        currentInput.toLowerCase().includes(keyword)
      );

      if (isBusinessQuery) {
        // Comprehensive data fetching for better responses
        const [
          ordersResult,
          chargingResult,
          expensesResult,
          depositsResult,
          withdrawalsResult,
          cooperativeResult,
          menuItemsResult,
          profilesResult
        ] = await Promise.all([
          supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('charging_sessions').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('deposits').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('withdrawals').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('cooperative_savings').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('menu_items').select('*'),
          supabase.from('profiles').select('*').limit(50)
        ]);

        const orders = ordersResult.data || [];
        const chargingSessions = chargingResult.data || [];
        const expenses = expensesResult.data || [];
        const deposits = depositsResult.data || [];
        const withdrawals = withdrawalsResult.data || [];
        const cooperative = cooperativeResult.data || [];
        const menuItems = menuItemsResult.data || [];
        const profiles = profilesResult.data || [];

        // Calculate comprehensive metrics
        const ordersRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
        const chargingRevenue = chargingSessions.reduce((sum, session) => sum + Number(session.total_amount), 0);
        const totalRevenue = ordersRevenue + chargingRevenue;
        const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
        const totalDeposits = deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
        const totalWithdrawals = withdrawals.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0);
        const totalSavings = cooperative.reduce((sum, saving) => sum + Number(saving.contribution_amount), 0);
        const netProfit = totalRevenue - totalExpenses;

        // Enhanced query processing
        const query = currentInput.toLowerCase();

        if (query.includes('menu') || query.includes('items') || query.includes('food')) {
          const availableItems = menuItems.filter(item => item.is_available).length;
          const unavailableItems = menuItems.filter(item => !item.is_available).length;
          const categories = [...new Set(menuItems.map(item => item.category))];
          
          botResponse = `📋 **Menu Information:**
• Total menu items: ${menuItems.length}
• Available items: ${availableItems}
• Unavailable items: ${unavailableItems}
• Categories: ${categories.join(', ')}
• Average price: NRs. ${menuItems.length > 0 ? (menuItems.reduce((sum, item) => sum + item.price, 0) / menuItems.length).toFixed(2) : '0'}

You can manage menu items in the Menu Management section.`;

        } else if (query.includes('user') || query.includes('customer') || query.includes('profile')) {
          botResponse = `👥 **User Information:**
• Total registered users: ${profiles.length}
• Recent registrations: ${profiles.filter(p => new Date(p.created_at || '').getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000).length} in last 30 days

Visit User Management for detailed user administration.`;

        } else if (query.includes('charging') || query.includes('session') || query.includes('energy')) {
          const avgSessionAmount = chargingSessions.length > 0 ? chargingRevenue / chargingSessions.length : 0;
          const recentSessions = chargingSessions.filter(s => new Date(s.created_at || '').getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length;
          
          botResponse = `⚡ **Charging Sessions Analysis:**
• Total sessions: ${chargingSessions.length}
• Total revenue: NRs. ${chargingRevenue.toLocaleString()}
• Average per session: NRs. ${avgSessionAmount.toFixed(2)}
• Sessions this week: ${recentSessions}

Check the Charging tab for detailed session management.`;

        } else if (query.includes('expense') || query.includes('cost') || query.includes('spending')) {
          const expenseCategories = expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
            return acc;
          }, {} as Record<string, number>);
          
          const topCategory = Object.entries(expenseCategories).sort(([,a], [,b]) => b - a)[0];
          
          botResponse = `💸 **Expense Analysis:**
• Total expenses: NRs. ${totalExpenses.toLocaleString()}
• Number of transactions: ${expenses.length}
• Top category: ${topCategory ? `${topCategory[0]} (NRs. ${topCategory[1].toLocaleString()})` : 'N/A'}
• Average expense: NRs. ${expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : '0'}

Visit the Expenses tab for detailed expense management.`;

        } else if (query.includes('deposit') || query.includes('money in') || query.includes('income')) {
          const depositModes = deposits.reduce((acc, deposit) => {
            acc[deposit.mode] = (acc[deposit.mode] || 0) + Number(deposit.amount);
            return acc;
          }, {} as Record<string, number>);
          
          botResponse = `💰 **Deposits Summary:**
• Total deposits: NRs. ${totalDeposits.toLocaleString()}
• Number of deposits: ${deposits.length}
• Payment modes: ${Object.keys(depositModes).join(', ')}
• Average deposit: NRs. ${deposits.length > 0 ? (totalDeposits / deposits.length).toFixed(2) : '0'}

Check the Deposits tab for detailed deposit tracking.`;

        } else if (query.includes('withdrawal') || query.includes('money out')) {
          botResponse = `🏧 **Withdrawals Summary:**
• Total withdrawals: NRs. ${totalWithdrawals.toLocaleString()}
• Number of withdrawals: ${withdrawals.length}
• Average withdrawal: NRs. ${withdrawals.length > 0 ? (totalWithdrawals / withdrawals.length).toFixed(2) : '0'}

Visit the Withdrawals tab for detailed withdrawal management.`;

        } else if (query.includes('saving') || query.includes('cooperative')) {
          const uniqueCooperatives = [...new Set(cooperative.map(s => s.member_id))];
          
          botResponse = `🏦 **Cooperative Savings:**
• Total savings: NRs. ${totalSavings.toLocaleString()}
• Number of contributions: ${cooperative.length}
• Unique cooperatives: ${uniqueCooperatives.length}
• Average contribution: NRs. ${cooperative.length > 0 ? (totalSavings / cooperative.length).toFixed(2) : '0'}

Check the Savings tab for cooperative savings management.`;

        } else if (query.includes('profit') || query.includes('loss') || query.includes('performance')) {
          const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
          
          botResponse = `📊 **Financial Performance:**
• Total Revenue: NRs. ${totalRevenue.toLocaleString()}
• Total Expenses: NRs. ${totalExpenses.toLocaleString()}
• Net Profit: NRs. ${netProfit.toLocaleString()}
• Profit Margin: ${profitMargin.toFixed(1)}%
• ${netProfit > 0 ? '✅ Your business is profitable!' : '⚠️ Consider reviewing expenses to improve profitability.'}

Visit the Analytics tab for detailed insights!`;

        } else if (query.includes('payment') || query.includes('cash') || query.includes('esewa') || query.includes('fonepay')) {
          const allPayments = [
            ...orders.map(o => ({ mode: o.payment_mode, amount: o.total, type: 'income' })),
            ...chargingSessions.map(c => ({ mode: c.payment_mode, amount: c.total_amount, type: 'income' })),
            ...expenses.map(e => ({ mode: e.payment_mode, amount: e.amount, type: 'expense' }))
          ];
          
          const paymentSummary = allPayments.reduce((acc, payment) => {
            if (!acc[payment.mode]) acc[payment.mode] = { income: 0, expense: 0 };
            acc[payment.mode][payment.type] += Number(payment.amount);
            return acc;
          }, {} as Record<string, { income: number; expense: number }>);
          
          botResponse = `💳 **Payment Methods Analysis:**\n` +
            Object.entries(paymentSummary).map(([mode, data]) => 
              `• ${mode}: Income NRs. ${data.income.toLocaleString()}, Expenses NRs. ${data.expense.toLocaleString()}, Net: NRs. ${(data.income - data.expense).toLocaleString()}`
            ).join('\n') +
            `\n\nCheck Analytics for detailed payment method breakdowns.`;

        } else if (query.includes('balance') || query.includes('summary') || query.includes('overview')) {
          botResponse = `📈 **Business Overview:**
• 💰 Total Revenue: NRs. ${totalRevenue.toLocaleString()}
• 💸 Total Expenses: NRs. ${totalExpenses.toLocaleString()}
• 📊 Net Profit: NRs. ${netProfit.toLocaleString()}
• 🛒 Total Orders: ${orders.length}
• ⚡ Charging Sessions: ${chargingSessions.length}
• 🏦 Savings: NRs. ${totalSavings.toLocaleString()}
• 👥 Users: ${profiles.length}

${netProfit > 0 ? '🎉 Great job! Your business is performing well.' : '💡 Consider optimizing expenses for better profitability.'}`;

        } else {
          // Default comprehensive response
          botResponse = `📊 **Quick Business Summary:**
• Revenue (Last 100 transactions): NRs. ${totalRevenue.toLocaleString()}
• Expenses: NRs. ${totalExpenses.toLocaleString()}
• Net Profit: NRs. ${netProfit.toLocaleString()}
• Orders: ${orders.length} | Charging: ${chargingSessions.length}

💡 **Ask me about:**
• Menu items and categories
• Sales and revenue trends
• Expense breakdowns
• Payment method analysis
• User statistics
• Profit/loss analysis
• Deposits and withdrawals
• Cooperative savings

Visit the Analytics tab for detailed insights!`;
        }
      } else {
        // General business assistance
        const responses = [
          "I'd be happy to help! I can provide insights about your business data including sales, expenses, profits, menu items, users, and much more. Try asking about specific aspects of your business!",
          "You can ask me about various aspects of your business: revenue trends, expense categories, menu performance, user statistics, payment methods, or financial summaries. What would you like to know?",
          "I have access to all your business data! Ask me about orders, charging sessions, expenses, deposits, withdrawals, cooperative savings, menu items, or users. I can provide detailed analytics and insights.",
          "Need business insights? I can help with financial analysis, performance metrics, user data, menu management insights, and much more. Just ask about any aspect of your business!"
        ];
        botResponse = responses[Math.floor(Math.random() * responses.length)];
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error getting bot response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Sorry, I encountered an error while processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "Error",
        description: "Failed to get response from chatbot",
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
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] shadow-xl z-50 flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Business Assistant</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 pt-0 min-h-0">
        <ScrollArea className="flex-1 pr-3" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm break-words ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  }`}
                  style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                
                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
            placeholder="Ask about your business data..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatBot;