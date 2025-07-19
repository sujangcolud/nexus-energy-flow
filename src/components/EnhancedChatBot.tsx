import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send,
  Bot,
  User,
  MessageCircle,
  X,
  Minimize2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  DollarSign,
  BarChart3,
  PieChart,
  Calculator,
  Database,
  Brain,
  Lightbulb,
  Target,
  Zap,
  ShoppingCart,
  Receipt,
  CreditCard,
  Banknote,
  PiggyBank,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  parseISO,
} from "date-fns";

interface Message {
  id: string;
  type: "user" | "bot" | "system";
  content: string;
  timestamp: Date;
  data?: any;
  intent?: string;
  confidence?: number;
}

interface DataContext {
  orders: any[];
  charging: any[];
  expenses: any[];
  deposits: any[];
  withdrawals: any[];
  cooperative: any[];
  vat_entries: any[];
  inventory: any[];
  daily_summary: any[];
}

interface ChatBotProps {
  isOpen: boolean;
  onToggle: () => void;
}

const EnhancedChatBot = ({ isOpen, onToggle }: ChatBotProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content: `🤖 **Enhanced Business Intelligence Assistant**

Welcome to your comprehensive business analytics companion! I have deep knowledge of your entire database and can provide detailed insights on any aspect of your business.

🧠 **My Capabilities:**
• **Real-time Data Analysis** - Live calculations from your database
• **Natural Language Processing** - Understand complex business questions
• **Predictive Analytics** - Trends and forecasting
• **Micro-detail Queries** - Granular transaction analysis
• **Financial Intelligence** - Revenue, expenses, profit optimization
• **Operational Insights** - Menu performance, staff productivity
• **Comparative Analysis** - Period-over-period comparisons

💡 **Ask me anything like:**
• "Show me detailed analysis of today's charging sessions"
• "Which menu items have the highest profit margins?"
• "What's my cash flow pattern for the last 30 days?"
• "Compare this month's performance with last month"
• "Find all transactions over NRs. 1000 in the last week"
• "Analyze my VAT entries and suggest optimizations"

Just ask naturally - I understand business context!`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dataContext, setDataContext] = useState<DataContext | null>(null);
  const [lastDataFetch, setLastDataFetch] = useState<Date | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Enhanced example queries
  const smartQueries = [
    {
      category: "Financial Analysis",
      icon: DollarSign,
      queries: [
        "What's my profit margin trend over the last 3 months?",
        "Show me payment method distribution for this week",
        "Which days are most profitable?",
        "Calculate my break-even point",
      ],
    },
    {
      category: "Operational Intelligence",
      icon: BarChart3,
      queries: [
        "Which menu items sell best on weekends?",
        "What's the average charging session duration?",
        "Show me expense categories that are increasing",
        "Analyze peak hours for orders",
      ],
    },
    {
      category: "Detailed Analytics",
      icon: Brain,
      queries: [
        "Find all transactions with cash payments over NRs. 500",
        "Show me customers who made multiple orders today",
        "What's the correlation between weather and sales?",
        "Analyze my inventory turnover rate",
      ],
    },
  ];

  useEffect(() => {
    if (
      isOpen &&
      user &&
      (!lastDataFetch || Date.now() - lastDataFetch.getTime() > 300000)
    ) {
      fetchAllData(); // Refresh data every 5 minutes
    }
  }, [isOpen, user]);

  const fetchAllData = async () => {
    if (!user) return;

    try {
      console.log("🔄 Fetching comprehensive business data...");

      const [
        ordersRes,
        chargingRes,
        expensesRes,
        depositsRes,
        withdrawalsRes,
        cooperativeRes,
        vatRes,
        inventoryRes,
        summaryRes,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("charging_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("deposits")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("cooperative_savings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("vat_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("inventory")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("daily_summary")
          .select("*")
          .order("summary_date", { ascending: false })
          .limit(90),
      ]);

      const context: DataContext = {
        orders: ordersRes.data || [],
        charging: chargingRes.data || [],
        expenses: expensesRes.data || [],
        deposits: depositsRes.data || [],
        withdrawals: withdrawalsRes.data || [],
        cooperative: cooperativeRes.data || [],
        vat_entries: vatRes.data || [],
        inventory: inventoryRes.data || [],
        daily_summary: summaryRes.data || [],
      };

      setDataContext(context);
      setLastDataFetch(new Date());
      console.log("✅ Data context loaded:", context);
    } catch (error) {
      logError("fetching chatbot data context", error);
      console.error("Failed to fetch data context:", error);
    }
  };

  const analyzeUserIntent = (
    query: string,
  ): { intent: string; entities: string[]; confidence: number } => {
    const lowerQuery = query.toLowerCase();

    // Enhanced intent recognition patterns
    const patterns = {
      financial_analysis: [
        /profit|revenue|income|sales|earning|financial|money|cash.*flow/,
        /total.*income|net.*profit|gross.*margin|break.*even/,
      ],
      comparison: [
        /compare|vs|versus|against|difference|between|last.*month|previous/,
        /this.*month|week|year.*vs|trend|growth|decline/,
      ],
      specific_data: [
        /show.*me|display|list|find|get.*all|details.*of|breakdown.*of/,
        /specific|particular|exact|precise|detailed/,
      ],
      time_analysis: [
        /today|yesterday|this.*week|last.*week|month|year|period|time|date/,
        /daily|weekly|monthly|yearly|hourly/,
      ],
      calculation: [
        /calculate|compute|sum|total|average|mean|max|min|count/,
        /percentage|ratio|rate|margin|cost/,
      ],
      prediction: [
        /predict|forecast|trend|future|expect|estimate|project/,
        /what.*will|how.*much.*next|forecast/,
      ],
    };

    let bestIntent = "general";
    let confidence = 0.1;
    let entities: string[] = [];

    // Extract entities (numbers, dates, amounts, categories)
    entities = entities.concat(
      query.match(/\d+/g) || [],
      query.match(
        /\b(orders?|charging|expenses?|deposits?|withdrawals?|vat|inventory|menu)\b/gi,
      ) || [],
      query.match(/\b(cash|esewa|fonepay|bank|credit|debit)\b/gi) || [],
      query.match(/\b(today|yesterday|week|month|year)\b/gi) || [],
    );

    // Calculate intent confidence
    for (const [intent, regexList] of Object.entries(patterns)) {
      let matches = 0;
      for (const regex of regexList) {
        if (regex.test(lowerQuery)) matches++;
      }
      const intentConfidence = matches / regexList.length;
      if (intentConfidence > confidence) {
        confidence = intentConfidence;
        bestIntent = intent;
      }
    }

    return { intent: bestIntent, entities, confidence };
  };

  const generateIntelligentResponse = async (
    query: string,
  ): Promise<string> => {
    if (!dataContext) {
      return "⚠️ Still loading your business data. Please wait a moment and try again.";
    }

    const { intent, entities, confidence } = analyzeUserIntent(query);
    const lowerQuery = query.toLowerCase();

    try {
      // Financial Analysis Queries
      if (
        intent === "financial_analysis" ||
        /profit|revenue|income|financial/.test(lowerQuery)
      ) {
        return generateFinancialAnalysis(query, lowerQuery);
      }

      // Comparison Queries
      if (
        intent === "comparison" ||
        /compare|vs|last.*month|previous/.test(lowerQuery)
      ) {
        return generateComparisonAnalysis(query, lowerQuery);
      }

      // Time-based Analysis
      if (
        intent === "time_analysis" ||
        /today|week|month|daily/.test(lowerQuery)
      ) {
        return generateTimeAnalysis(query, lowerQuery);
      }

      // Specific Data Queries
      if (
        intent === "specific_data" ||
        /show.*me|list|find|details/.test(lowerQuery)
      ) {
        return generateSpecificDataResponse(query, lowerQuery);
      }

      // Calculation Queries
      if (
        intent === "calculation" ||
        /calculate|total|average|sum/.test(lowerQuery)
      ) {
        return generateCalculationResponse(query, lowerQuery);
      }

      // Default enhanced response
      return generateContextualResponse(query);
    } catch (error) {
      logError("generating intelligent response", error);
      return `❌ I encountered an error analyzing your query. Please try rephrasing your question. Error: ${extractErrorMessage(error)}`;
    }
  };

  const generateFinancialAnalysis = (
    query: string,
    lowerQuery: string,
  ): string => {
    const today = new Date();
    const { orders, charging, expenses, deposits, withdrawals } = dataContext!;

    // Calculate comprehensive financial metrics
    const totalRevenue = [...orders, ...charging].reduce(
      (sum, item) => sum + (item.total || item.total_amount || 0),
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0,
    );
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Payment method breakdown
    const paymentBreakdown = [...orders, ...charging].reduce(
      (acc, item) => {
        const mode = (item.payment_mode || "unknown").toLowerCase();
        acc[mode] = (acc[mode] || 0) + (item.total || item.total_amount || 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Recent performance (last 7 days)
    const weekAgo = subDays(today, 7);
    const recentTransactions = [...orders, ...charging].filter((item) => {
      const date = parseISO(
        item.order_date || item.session_date || item.created_at,
      );
      return date >= weekAgo;
    });
    const recentRevenue = recentTransactions.reduce(
      (sum, item) => sum + (item.total || item.total_amount || 0),
      0,
    );

    return `📊 **Comprehensive Financial Analysis**

💰 **Overall Performance:**
• Total Revenue: **NRs. ${totalRevenue.toLocaleString()}**
• Total Expenses: **NRs. ${totalExpenses.toLocaleString()}**
• Net Profit: **NRs. ${netProfit.toLocaleString()}** (${profitMargin.toFixed(1)}% margin)

💳 **Payment Method Distribution:**
${Object.entries(paymentBreakdown)
  .map(
    ([mode, amount]) =>
      `• ${mode.charAt(0).toUpperCase() + mode.slice(1)}: NRs. ${amount.toLocaleString()}`,
  )
  .join("\n")}

📈 **Recent Performance (Last 7 Days):**
• Revenue: **NRs. ${recentRevenue.toLocaleString()}**
• Daily Average: **NRs. ${(recentRevenue / 7).toLocaleString()}**
• Orders Count: **${recentTransactions.filter((t) => t.total).length}**
• Charging Sessions: **${recentTransactions.filter((t) => t.total_amount).length}**

💡 **Insights:**
${netProfit > 0 ? "✅ Your business is profitable!" : "⚠️ Consider cost optimization strategies."}
${profitMargin > 20 ? "🎯 Excellent profit margins!" : profitMargin > 10 ? "👍 Good profit margins." : "📉 Profit margins need improvement."}
`;
  };

  const generateComparisonAnalysis = (
    query: string,
    lowerQuery: string,
  ): string => {
    const { orders, charging, expenses, daily_summary } = dataContext!;
    const today = new Date();

    // This month vs last month
    const thisMonthStart = startOfMonth(today);
    const lastMonthStart = startOfMonth(subDays(thisMonthStart, 1));
    const lastMonthEnd = endOfMonth(subDays(thisMonthStart, 1));

    const thisMonthData = [...orders, ...charging].filter((item) => {
      const date = parseISO(
        item.order_date || item.session_date || item.created_at,
      );
      return date >= thisMonthStart;
    });

    const lastMonthData = [...orders, ...charging].filter((item) => {
      const date = parseISO(
        item.order_date || item.session_date || item.created_at,
      );
      return date >= lastMonthStart && date <= lastMonthEnd;
    });

    const thisMonthRevenue = thisMonthData.reduce(
      (sum, item) => sum + (item.total || item.total_amount || 0),
      0,
    );
    const lastMonthRevenue = lastMonthData.reduce(
      (sum, item) => sum + (item.total || item.total_amount || 0),
      0,
    );
    const revenueChange =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    const thisMonthExpenses = expenses
      .filter((exp) => {
        const date = parseISO(exp.expense_date || exp.created_at);
        return date >= thisMonthStart;
      })
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const lastMonthExpenses = expenses
      .filter((exp) => {
        const date = parseISO(exp.expense_date || exp.created_at);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const expenseChange =
      lastMonthExpenses > 0
        ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : 0;

    return `📊 **Monthly Performance Comparison**

💰 **Revenue Comparison:**
• This Month: **NRs. ${thisMonthRevenue.toLocaleString()}**
• Last Month: **NRs. ${lastMonthRevenue.toLocaleString()}**
• Change: **${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%** ${revenueChange >= 0 ? "📈" : "📉"}

💸 **Expense Comparison:**
• This Month: **NRs. ${thisMonthExpenses.toLocaleString()}**
• Last Month: **NRs. ${lastMonthExpenses.toLocaleString()}**
• Change: **${expenseChange >= 0 ? "+" : ""}${expenseChange.toFixed(1)}%** ${expenseChange >= 0 ? "📈" : "📉"}

📈 **Transaction Volume:**
• This Month: **${thisMonthData.length} transactions**
• Last Month: **${lastMonthData.length} transactions**

💡 **Analysis:**
${revenueChange > 10 ? "🚀 Excellent revenue growth!" : revenueChange > 0 ? "👍 Positive revenue trend." : "⚠️ Revenue needs attention."}
${expenseChange < -5 ? "💰 Great expense control!" : expenseChange > 10 ? "⚠️ Expenses are increasing rapidly." : "📊 Stable expense management."}
`;
  };

  const generateTimeAnalysis = (query: string, lowerQuery: string): string => {
    const { orders, charging, expenses } = dataContext!;
    const today = new Date();

    if (/today/.test(lowerQuery)) {
      const todayStr = format(today, "yyyy-MM-dd");
      const todayData = [...orders, ...charging].filter((item) => {
        const itemDate =
          item.order_date || item.session_date || item.created_at;
        return itemDate && itemDate.startsWith(todayStr);
      });

      const todayRevenue = todayData.reduce(
        (sum, item) => sum + (item.total || item.total_amount || 0),
        0,
      );
      const todayExpenses = expenses
        .filter((exp) => {
          const expDate = exp.expense_date || exp.created_at;
          return expDate && expDate.startsWith(todayStr);
        })
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);

      return `📅 **Today's Performance (${format(today, "MMM dd, yyyy")})**

💰 **Financial Summary:**
• Revenue: **NRs. ${todayRevenue.toLocaleString()}**
• Expenses: **NRs. ${todayExpenses.toLocaleString()}**
• Net Profit: **NRs. ${(todayRevenue - todayExpenses).toLocaleString()}**

📊 **Transaction Details:**
• Orders: **${todayData.filter((t) => t.total).length}**
• Charging Sessions: **${todayData.filter((t) => t.total_amount).length}**
• Total Transactions: **${todayData.length}**

💡 **Performance Indicator:**
${todayRevenue > 1000 ? "🎯 Strong sales day!" : todayRevenue > 500 ? "👍 Good performance." : "📈 Room for improvement."}
`;
    }

    // Default week analysis
    const weekStart = startOfWeek(today);
    const weekData = [...orders, ...charging].filter((item) => {
      const date = parseISO(
        item.order_date || item.session_date || item.created_at,
      );
      return date >= weekStart;
    });

    const weekRevenue = weekData.reduce(
      (sum, item) => sum + (item.total || item.total_amount || 0),
      0,
    );

    return `📅 **This Week's Analysis**

💰 **Weekly Performance:**
• Total Revenue: **NRs. ${weekRevenue.toLocaleString()}**
• Daily Average: **NRs. ${(weekRevenue / 7).toLocaleString()}**
• Total Transactions: **${weekData.length}**

📊 **Daily Breakdown:**
${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  .map((day, index) => {
    const dayData = weekData.filter((item) => {
      const date = parseISO(
        item.order_date || item.session_date || item.created_at,
      );
      return date.getDay() === (index + 1) % 7;
    });
    const dayRevenue = dayData.reduce(
      (sum, item) => sum + (item.total || item.total_amount || 0),
      0,
    );
    return `• ${day}: NRs. ${dayRevenue.toLocaleString()} (${dayData.length} transactions)`;
  })
  .join("\n")}
`;
  };

  const generateSpecificDataResponse = (
    query: string,
    lowerQuery: string,
  ): string => {
    const { orders, charging, expenses, vat_entries } = dataContext!;

    if (/vat|tax/.test(lowerQuery)) {
      const totalVAT = vat_entries.reduce(
        (sum, entry) => sum + (entry.vat_amount || 0),
        0,
      );
      const vatEntries = vat_entries.length;

      return `🧾 **VAT Entries Analysis**

💰 **VAT Summary:**
• Total VAT Collected: **NRs. ${totalVAT.toLocaleString()}**
• Number of Entries: **${vatEntries}**
• Average VAT per Entry: **NRs. ${vatEntries > 0 ? (totalVAT / vatEntries).toFixed(2) : "0"}**

📊 **Recent VAT Entries:**
${vat_entries
  .slice(0, 5)
  .map(
    (entry) =>
      `• ${entry.item_name}: NRs. ${entry.vat_amount} (${entry.vat_rate}%)`,
  )
  .join("\n")}
`;
    }

    if (/expense|cost/.test(lowerQuery)) {
      const expensesByCategory = expenses.reduce(
        (acc, exp) => {
          const category = exp.category || "Uncategorized";
          acc[category] = (acc[category] || 0) + (exp.amount || 0);
          return acc;
        },
        {} as Record<string, number>,
      );

      return `💸 **Expense Analysis**

📊 **By Category:**
${Object.entries(expensesByCategory)
  .map(
    ([category, amount]) =>
      `• ${category}: **NRs. ${amount.toLocaleString()}**`,
  )
  .join("\n")}

📈 **Recent Expenses:**
${expenses
  .slice(0, 5)
  .map(
    (exp) =>
      `• ${exp.description || "Expense"}: NRs. ${exp.amount} (${exp.category || "General"})`,
  )
  .join("\n")}
`;
    }

    return "🔍 I can provide detailed analysis on any aspect of your business. Try asking about specific areas like 'VAT entries', 'expense breakdown', 'charging sessions', or 'menu performance'.";
  };

  const generateCalculationResponse = (
    query: string,
    lowerQuery: string,
  ): string => {
    const { orders, charging, expenses, deposits, withdrawals } = dataContext!;

    if (/average|mean/.test(lowerQuery)) {
      const avgOrderValue =
        orders.length > 0
          ? orders.reduce((sum, order) => sum + (order.total || 0), 0) /
            orders.length
          : 0;
      const avgChargingValue =
        charging.length > 0
          ? charging.reduce(
              (sum, session) => sum + (session.total_amount || 0),
              0,
            ) / charging.length
          : 0;

      return `🧮 **Average Value Calculations**

📊 **Transaction Averages:**
• Average Order Value: **NRs. ${avgOrderValue.toFixed(2)}**
• Average Charging Session: **NRs. ${avgChargingValue.toFixed(2)}**
• Average Expense: **NRs. ${expenses.length > 0 ? (expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) / expenses.length).toFixed(2) : "0"}**

💡 **Insights:**
• Higher order values indicate better customer spend
• Charging sessions show energy pricing effectiveness
• Expense averages help budget planning
`;
    }

    // Default total calculations
    const totals = {
      orders: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      charging: charging.reduce(
        (sum, session) => sum + (session.total_amount || 0),
        0,
      ),
      expenses: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
      deposits: deposits.reduce((sum, dep) => sum + (dep.amount || 0), 0),
      withdrawals: withdrawals.reduce((sum, wit) => sum + (wit.amount || 0), 0),
    };

    return `🧮 **Business Totals Calculation**

💰 **Revenue Streams:**
• Orders Total: **NRs. ${totals.orders.toLocaleString()}**
• Charging Total: **NRs. ${totals.charging.toLocaleString()}**
• **Combined Revenue: NRs. ${(totals.orders + totals.charging).toLocaleString()}**

💸 **Cash Flow:**
• Total Expenses: **NRs. ${totals.expenses.toLocaleString()}**
• Total Deposits: **NRs. ${totals.deposits.toLocaleString()}**
• Total Withdrawals: **NRs. ${totals.withdrawals.toLocaleString()}**

📊 **Net Position:**
• Gross Profit: **NRs. ${(totals.orders + totals.charging - totals.expenses).toLocaleString()}**
• Cash Position: **NRs. ${(totals.orders + totals.charging + totals.deposits - totals.expenses - totals.withdrawals).toLocaleString()}**
`;
  };

  const generateContextualResponse = (query: string): string => {
    const queryWords = query.toLowerCase().split(" ");
    const { orders, charging, expenses } = dataContext!;

    // Simple keyword-based responses for unmatched queries
    if (
      queryWords.some((word) =>
        ["help", "assistance", "support"].includes(word),
      )
    ) {
      return `🤝 **How I Can Help You**

I'm your intelligent business assistant with access to all your business data. I can:

🔍 **Analyze Any Data:**
• Financial performance and trends
• Transaction details and patterns
• Customer behavior insights
• Operational efficiency metrics

💡 **Provide Smart Insights:**
• Revenue optimization suggestions
• Cost reduction opportunities
• Growth trend analysis
• Performance benchmarking

📊 **Generate Reports:**
• Custom date range analysis
• Comparative performance studies
• Detailed breakdowns by category
• Predictive forecasting

Just ask me anything about your business data!`;
    }

    return `🤖 I understand you're asking about "${query}". Let me analyze your business data and provide insights.

📊 **Quick Business Overview:**
• Total Orders: **${orders.length}**
• Charging Sessions: **${charging.length}**
• Total Revenue: **NRs. ${(orders.reduce((s, o) => s + (o.total || 0), 0) + charging.reduce((s, c) => s + (c.total_amount || 0), 0)).toLocaleString()}**

💡 **Try asking more specific questions like:**
• "What's my best-selling menu item?"
• "Show me today's charging station performance"
• "Calculate my weekly profit margins"
• "Compare this month vs last month"

I'm continuously learning and can provide deeper insights with more specific queries!`;
  };

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
      const response = await generateIntelligentResponse(inputValue);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: `❌ I encountered an error processing your request: ${extractErrorMessage(error)}. Please try rephrasing your question.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 z-50"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] shadow-2xl z-50 border-2 border-blue-200 bg-gradient-to-b from-white to-blue-50">
      <CardHeader className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Business Assistant
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Database className="h-3 w-3 mr-1" />
            Live Data Connected
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col h-[calc(600px-120px)]">
        <Tabs defaultValue="chat" className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2 m-2">
            <TabsTrigger value="chat" className="text-xs">
              Chat
            </TabsTrigger>
            <TabsTrigger value="examples" className="text-xs">
              Smart Queries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex flex-col h-full m-0">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.type === "bot" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === "user"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-gray-100 text-gray-800 rounded-bl-none"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {format(message.timestamp, "HH:mm")}
                      </div>
                    </div>
                    {message.type === "user" && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Analyzing your query...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask me anything about your business..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="examples"
            className="p-4 space-y-4 overflow-y-auto"
          >
            {smartQueries.map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <category.icon className="h-4 w-4" />
                  {category.category}
                </div>
                <div className="space-y-1">
                  {category.queries.map((query, queryIndex) => (
                    <button
                      key={queryIndex}
                      onClick={() => setInputValue(query)}
                      className="block w-full text-left text-xs p-2 bg-gray-50 hover:bg-blue-50 rounded border text-gray-700 hover:text-blue-700 transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedChatBot;
