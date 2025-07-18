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
      content: 'Hello! I\'m your business assistant. I can help you with analytics, reports, and general business questions. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
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
    setInputValue('');
    setIsLoading(true);

    try {
      // Check if this is a business data query
      const businessKeywords = ['sales', 'revenue', 'orders', 'expenses', 'analytics', 'report', 'data', 'profit', 'loss'];
      const isBusinessQuery = businessKeywords.some(keyword => 
        inputValue.toLowerCase().includes(keyword)
      );

      let botResponse = '';

      if (isBusinessQuery) {
        // Get some basic business data to provide context
        const [ordersResult, expensesResult] = await Promise.all([
          supabase.from('orders').select('total').gte('order_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
          supabase.from('expenses').select('amount').gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        ]);

        const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + order.total, 0) || 0;
        const totalExpenses = expensesResult.data?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
        const profit = totalRevenue - totalExpenses;

        if (inputValue.toLowerCase().includes('sales') || inputValue.toLowerCase().includes('revenue')) {
          botResponse = `In the last 30 days, your total revenue from orders is NRs. ${totalRevenue.toLocaleString()}. You can view detailed sales analytics in the Analytics tab for more insights.`;
        } else if (inputValue.toLowerCase().includes('expenses')) {
          botResponse = `Your total expenses in the last 30 days amount to NRs. ${totalExpenses.toLocaleString()}. Check the Expenses tab to see category-wise breakdown.`;
        } else if (inputValue.toLowerCase().includes('profit')) {
          botResponse = `Based on the last 30 days data: Revenue: NRs. ${totalRevenue.toLocaleString()}, Expenses: NRs. ${totalExpenses.toLocaleString()}, Net Profit: NRs. ${profit.toLocaleString()}. ${profit > 0 ? 'Great job on maintaining profitability!' : 'Consider reviewing expenses to improve profitability.'}`;
        } else {
          botResponse = `I can see you're asking about business data. Here's a quick overview: Last 30 days - Revenue: NRs. ${totalRevenue.toLocaleString()}, Expenses: NRs. ${totalExpenses.toLocaleString()}. Visit the Analytics tab for detailed insights!`;
        }
      } else {
        // General business assistance
        const responses = [
          "I'd be happy to help! For specific data queries, try asking about sales, revenue, expenses, or profits. I can also guide you to the right tabs in your dashboard.",
          "You can find detailed analytics in the Analytics tab, create reports in the Reports section, or manage your data in the respective tabs. What specific information are you looking for?",
          "Need help navigating the dashboard? You can access Orders, Charging sessions, Expenses, Deposits, and more from the main dashboard. Each section has detailed management capabilities.",
          "For business insights, check out the Analytics tab which shows revenue trends, expense breakdowns, and key performance metrics. Is there something specific you'd like to know?"
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
      <CardHeader className="pb-3">
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
      
      <CardContent className="flex-1 flex flex-col p-4 pt-0">
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
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  }`}
                >
                  {message.content}
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
        
        <div className="flex gap-2 mt-4">
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