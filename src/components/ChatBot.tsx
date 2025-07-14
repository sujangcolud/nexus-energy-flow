import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  User,
  MessageCircle,
  X,
  Minimize2,
  Sparkles,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  type: "user" | "bot";
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
      id: "1",
      type: "bot",
      content:
        "Hello! I'm your business assistant. I can help you with analytics, reports, and general business questions. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
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
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Check if this is a business data query
      const businessKeywords = [
        "sales",
        "revenue",
        "orders",
        "expenses",
        "analytics",
        "report",
        "data",
        "profit",
        "loss",
      ];
      const isBusinessQuery = businessKeywords.some((keyword) =>
        inputValue.toLowerCase().includes(keyword),
      );

      let botResponse = "";

      if (isBusinessQuery) {
        // Get some basic business data to provide context
        const [ordersResult, expensesResult] = await Promise.all([
          supabase
            .from("orders")
            .select("total")
            .gte(
              "order_date",
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            ),
          supabase
            .from("expenses")
            .select("amount")
            .gte(
              "expense_date",
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            ),
        ]);

        const totalRevenue =
          ordersResult.data?.reduce((sum, order) => sum + order.total, 0) || 0;
        const totalExpenses =
          expensesResult.data?.reduce(
            (sum, expense) => sum + expense.amount,
            0,
          ) || 0;
        const profit = totalRevenue - totalExpenses;

        if (
          inputValue.toLowerCase().includes("sales") ||
          inputValue.toLowerCase().includes("revenue")
        ) {
          botResponse = `In the last 30 days, your total revenue from orders is NRs. ${totalRevenue.toLocaleString()}. You can view detailed sales analytics in the Analytics tab for more insights.`;
        } else if (inputValue.toLowerCase().includes("expenses")) {
          botResponse = `Your total expenses in the last 30 days amount to NRs. ${totalExpenses.toLocaleString()}. Check the Expenses tab to see category-wise breakdown.`;
        } else if (inputValue.toLowerCase().includes("profit")) {
          botResponse = `Based on the last 30 days data: Revenue: NRs. ${totalRevenue.toLocaleString()}, Expenses: NRs. ${totalExpenses.toLocaleString()}, Net Profit: NRs. ${profit.toLocaleString()}. ${profit > 0 ? "Great job on maintaining profitability!" : "Consider reviewing expenses to improve profitability."}`;
        } else {
          botResponse = `I can see you're asking about business data. Here's a quick overview: Last 30 days - Revenue: NRs. ${totalRevenue.toLocaleString()}, Expenses: NRs. ${totalExpenses.toLocaleString()}. Visit the Analytics tab for detailed insights!`;
        }
      } else {
        // General business assistance
        const responses = [
          "I'd be happy to help! For specific data queries, try asking about sales, revenue, expenses, or profits. I can also guide you to the right tabs in your dashboard.",
          "You can find detailed analytics in the Analytics tab, create reports in the Reports section, or manage your data in the respective tabs. What specific information are you looking for?",
          "Need help navigating the dashboard? You can access Orders, Charging sessions, Expenses, Deposits, and more from the main dashboard. Each section has detailed management capabilities.",
          "For business insights, check out the Analytics tab which shows revenue trends, expense breakdowns, and key performance metrics. Is there something specific you'd like to know?",
        ];
        botResponse = responses[Math.floor(Math.random() * responses.length)];
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: botResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error getting bot response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content:
          "Sorry, I encountered an error while processing your request. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast({
        title: "Error",
        description: "Failed to get response from chatbot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 rounded-full w-16 h-16 shadow-2xl z-50 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transform hover:scale-110 transition-all duration-300 group animate-pulse"
        size="icon"
      >
        <div className="relative">
          <MessageCircle className="h-7 w-7 text-white" />
          <Sparkles className="h-4 w-4 text-yellow-300 absolute -top-1 -right-1 animate-bounce" />
        </div>
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] z-50">
      {/* Animated Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 via-purple-500/30 to-pink-400/30 rounded-lg blur-xl animate-pulse"></div>

      <Card className="relative bg-gradient-to-br from-white/95 to-blue-50/95 backdrop-blur-md shadow-2xl border-0 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg animate-pulse">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  AI Business Assistant
                  <Sparkles className="h-4 w-4 animate-bounce" />
                </CardTitle>
                <p className="text-xs text-white/80">Powered by Intelligence</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="hover:bg-white/20 text-white"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="hover:bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4 pt-0 relative">
          {/* Floating Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-10 left-10 w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-60 animate-pulse"></div>
            <div
              className="absolute top-20 right-8 w-1 h-1 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full opacity-40 animate-bounce"
              style={{ animationDelay: "1s" }}
            ></div>
            <div
              className="absolute bottom-20 left-6 w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-50 animate-pulse"
              style={{ animationDelay: "2s" }}
            ></div>
          </div>

          <ScrollArea className="flex-1 pr-3 relative z-10" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex gap-3 animate-in fade-in slide-in-from-bottom duration-300 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {message.type === "bot" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-lg ${
                      message.type === "user"
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white ml-auto transform hover:scale-105 transition-transform"
                        : "bg-gradient-to-r from-gray-50 to-blue-50 border border-blue-100 hover:shadow-xl transition-shadow"
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.type === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom duration-300">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm shadow-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gradient-to-r from-pink-400 to-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 mt-4 relative z-10">
            <div className="relative flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your business data..."
                disabled={isLoading}
                className="flex-1 border-blue-200 focus:border-blue-500 focus:ring-blue-500 bg-white/90 backdrop-blur-sm h-12 pr-12"
              />
              <Zap className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 animate-pulse" />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg transform hover:scale-110 transition-all duration-200"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatBot;
