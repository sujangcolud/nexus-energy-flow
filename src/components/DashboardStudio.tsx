import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  BarChart3,
  LineChart,
  PieChart,
  Table as TableIcon,
  TrendingUp,
  Calendar,
  Filter,
  Settings,
  Play,
  Save,
  Download,
  Upload,
  Trash2,
  Copy,
  Eye,
  Grid3X3,
  Layout,
  Database,
  Plus,
  X,
  Edit,
  Move,
  Palette,
  Code,
  FileText,
  Share2,
  RefreshCw,
  BarChart,
  Activity,
  DollarSign,
  Users,
  ShoppingCart,
  Zap,
  CreditCard,
  PiggyBank,
  Target,
  TrendingDown,
  Gauge,
  Brain,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/utils/errorHandling";
import { format } from "date-fns";

// Types for dashboard components
interface ChartConfig {
  id: string;
  type: "bar" | "line" | "pie" | "table" | "metric" | "gauge" | "kpi_card";
  title: string;
  dataSource: string;
  query: string;
  filters: FilterConfig[];
  styling: ChartStyling;
  position: { x: number; y: number };
  size: { width: number; height: number };
  value?: number;
  trend?: "up" | "down" | "neutral";
  percentage?: number;
  description?: string;
}

interface FilterConfig {
  id: string;
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "contains"
    | "between";
  value: any;
  label: string;
}

interface ChartStyling {
  colors: string[];
  backgroundColor: string;
  borderColor: string;
  fontSize: number;
  fontFamily: string;
  showLegend: boolean;
  showGrid: boolean;
  showLabels: boolean;
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  charts: ChartConfig[];
  layout: "grid" | "freeform";
  theme: "light" | "dark";
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  totalDeposits: number;
  totalWithdrawals: number;
  cooperativeSavings: number;
  chargingSessions: number;
}

// Available data sources from your database
const DATA_SOURCES = [
  {
    name: "Orders",
    table: "orders",
    fields: [
      "id",
      "item_name",
      "quantity",
      "rate",
      "total",
      "payment_mode",
      "order_date",
      "created_at",
    ],
  },
  {
    name: "Expenses",
    table: "expenses",
    fields: [
      "id",
      "description",
      "amount",
      "category",
      "payment_mode",
      "expense_date",
      "created_at",
    ],
  },
  {
    name: "Deposits",
    table: "deposits",
    fields: [
      "id",
      "amount",
      "mode",
      "deposited_by",
      "deposit_date",
      "created_at",
    ],
  },
  {
    name: "Withdrawals",
    table: "withdrawals",
    fields: ["id", "amount", "purpose", "withdrawal_date", "created_at"],
  },
  {
    name: "Charging Sessions",
    table: "charging_sessions",
    fields: [
      "id",
      "session_date",
      "start_percentage",
      "end_percentage",
      "total_amount",
      "payment_mode",
      "created_at",
    ],
  },
  {
    name: "Cooperative Savings",
    table: "cooperative_savings",
    fields: [
      "id",
      "member_id",
      "contribution_amount",
      "contribution_date",
      "cycle_period",
      "created_at",
    ],
  },
  {
    name: "Daily Summary",
    table: "daily_summary",
    fields: [
      "summary_date",
      "total_income",
      "total_expenses",
      "total_deposits",
      "total_withdrawals",
      "cash_balance",
    ],
  },
];

const CHART_TYPES = [
  {
    type: "kpi_card",
    icon: Target,
    label: "KPI Card",
    description: "Key performance indicator with trend",
  },
  {
    type: "metric",
    icon: TrendingUp,
    label: "Metric Card",
    description: "Show single key metric",
  },
  {
    type: "bar",
    icon: BarChart3,
    label: "Bar Chart",
    description: "Compare values across categories",
  },
  {
    type: "line",
    icon: LineChart,
    label: "Line Chart",
    description: "Show trends over time",
  },
  {
    type: "pie",
    icon: PieChart,
    label: "Pie Chart",
    description: "Show proportions of a whole",
  },
  {
    type: "gauge",
    icon: Gauge,
    label: "Gauge Chart",
    description: "Display progress or performance",
  },
  {
    type: "table",
    icon: TableIcon,
    label: "Data Table",
    description: "Display raw data in tabular format",
  },
];

const DEFAULT_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

const KPI_ICONS = {
  revenue: DollarSign,
  expenses: TrendingDown,
  profit: TrendingUp,
  orders: ShoppingCart,
  customers: Users,
  charging: Zap,
  deposits: CreditCard,
  withdrawals: PiggyBank,
  savings: PiggyBank,
  performance: Activity,
};

const DashboardStudio: React.FC = () => {
  const { user } = useAuth();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(
    null,
  );
  const [selectedChart, setSelectedChart] = useState<ChartConfig | null>(null);
  const [isCreatingChart, setIsCreatingChart] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [dashboardName, setDashboardName] = useState("");
  const [dashboardDescription, setDashboardDescription] = useState("");
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [isQueryRunning, setIsQueryRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardMetrics, setDashboardMetrics] =
    useState<DashboardMetrics | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

<<<<<<< HEAD
  // Load saved dashboards and metrics when component mounts
  useEffect(() => {
    if (user?.id) {
=======
  // Check if dashboard studio is supported
  useEffect(() => {
    const checkSupport = async () => {
      const { accessible, error } = await checkCustomCalculationsAccess();
      setIsSupported(accessible);

      if (!accessible) {
        console.warn(
          "Dashboard Studio: Falling back to localStorage mode. Error:",
          error,
        );
        toast.info(
          "Dashboard Studio is running in offline mode (data stored locally)",
          {
            description: "Your dashboards will be saved to browser storage.",
          },
        );
      }
    };

    checkSupport();
  }, []);

  // Show loading if user is not yet available or checking support
  if (!user || isSupported === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
          <p className="text-gray-600">
            {!user
              ? "Loading Dashboard Studio..."
              : "Checking system compatibility..."}
          </p>
        </div>
      </div>
    );
  }

  // Load saved dashboards when user is available
  useEffect(() => {
    if (user?.id && isSupported !== null) {
>>>>>>> origin/main
      loadDashboards();
      loadDashboardMetrics();
    }
  }, [user?.id]);

  const loadDashboardMetrics = async () => {
    if (!user?.id) return;

    try {
      // Fetch real-time metrics from your database
      const [
        { data: orders },
        { data: expenses },
        { data: deposits },
        { data: withdrawals },
        { data: cooperative },
        { data: charging },
      ] = await Promise.all([
        supabase.from("orders").select("total").eq("user_id", user.id),
        supabase.from("expenses").select("amount").eq("user_id", user.id),
        supabase.from("deposits").select("amount").eq("user_id", user.id),
        supabase.from("withdrawals").select("amount").eq("user_id", user.id),
        supabase
          .from("cooperative_savings")
          .select("contribution_amount")
          .eq("user_id", user.id),
        supabase
          .from("charging_sessions")
          .select("total_amount")
          .eq("user_id", user.id),
      ]);

      const totalRevenue =
        (orders || []).reduce((sum, o) => sum + (o.total || 0), 0) +
        (charging || []).reduce((sum, c) => sum + (c.total_amount || 0), 0);
      const totalExpenses = (expenses || []).reduce(
        (sum, e) => sum + (e.amount || 0),
        0,
      );
      const totalDeposits = (deposits || []).reduce(
        (sum, d) => sum + (d.amount || 0),
        0,
      );
      const totalWithdrawals = (withdrawals || []).reduce(
        (sum, w) => sum + (w.amount || 0),
        0,
      );
      const cooperativeSavings = (cooperative || []).reduce(
        (sum, c) => sum + (c.contribution_amount || 0),
        0,
      );

      const metrics: DashboardMetrics = {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalOrders: orders?.length || 0,
        totalCustomers: new Set(orders?.map((o: any) => o.user_id)).size || 0,
        avgOrderValue: orders?.length ? totalRevenue / orders.length : 0,
        totalDeposits,
        totalWithdrawals,
        cooperativeSavings,
        chargingSessions: charging?.length || 0,
      };

      setDashboardMetrics(metrics);
    } catch (error) {
      console.error("Error loading dashboard metrics:", error);
    }
  };

  const loadDashboards = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Try to load from localStorage first (fallback)
      const storedDashboards = localStorage.getItem(`dashboards_${user.id}`);
      if (storedDashboards) {
        try {
          const parsed = JSON.parse(storedDashboards);
          setDashboards(parsed);
        } catch (e) {
          console.error("Error parsing stored dashboards:", e);
        }
      }

      // Try to load from database
      try {
        const { data, error } = await supabase
          .from("custom_calculations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          const parsedDashboards = data.map((item) => {
            try {
              return {
                id: item.id,
                name: item.name,
                description: item.description || "",
                charts: JSON.parse(item.calculation_config || "[]"),
                layout: "grid" as const,
                theme: "light" as const,
                isPublic: false,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
              };
            } catch (parseError) {
              console.error("Error parsing dashboard config:", parseError);
              return {
                id: item.id,
                name: item.name,
                description: item.description || "",
                charts: [],
                layout: "grid" as const,
                theme: "light" as const,
                isPublic: false,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
              };
            }
          });
          setDashboards(parsedDashboards);
        }
      } catch (dbError) {
        console.warn(
          "Database not accessible, using localStorage only:",
          dbError,
        );
      }
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      console.error("Error loading dashboards:", errorMessage);
      toast.error(`Failed to load dashboards: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewDashboard = () => {
    const newDashboard: Dashboard = {
      id: Date.now().toString(),
      name: "My Analytics Dashboard",
      description: "Comprehensive business analytics and insights",
      charts: createDefaultCharts(),
      layout: "grid",
      theme: "light",
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentDashboard(newDashboard);
    setDashboardName(newDashboard.name);
    setDashboardDescription(newDashboard.description);
  };

  const createDefaultCharts = (): ChartConfig[] => {
    if (!dashboardMetrics) return [];

    return [
      {
        id: "revenue-kpi",
        type: "kpi_card",
        title: "Total Revenue",
        dataSource: "orders",
        query: "SELECT SUM(total) as value FROM orders",
        filters: [],
        styling: {
          colors: ["#10B981"],
          backgroundColor: "#F0FDF4",
          borderColor: "#BBF7D0",
          fontSize: 24,
          fontFamily: "Inter",
          showLegend: false,
          showGrid: false,
          showLabels: true,
        },
        position: { x: 0, y: 0 },
        size: { width: 300, height: 160 },
        value: dashboardMetrics.totalRevenue,
        trend: "up",
        percentage: 12.5,
        description: "Total revenue from all sources",
      },
      {
        id: "expenses-kpi",
        type: "kpi_card",
        title: "Total Expenses",
        dataSource: "expenses",
        query: "SELECT SUM(amount) as value FROM expenses",
        filters: [],
        styling: {
          colors: ["#EF4444"],
          backgroundColor: "#FEF2F2",
          borderColor: "#FECACA",
          fontSize: 24,
          fontFamily: "Inter",
          showLegend: false,
          showGrid: false,
          showLabels: true,
        },
        position: { x: 1, y: 0 },
        size: { width: 300, height: 160 },
        value: dashboardMetrics.totalExpenses,
        trend: "down",
        percentage: 8.3,
        description: "Total business expenses",
      },
      {
        id: "profit-kpi",
        type: "kpi_card",
        title: "Net Profit",
        dataSource: "calculated",
        query: "Revenue - Expenses",
        filters: [],
        styling: {
          colors: ["#3B82F6"],
          backgroundColor: "#EFF6FF",
          borderColor: "#BFDBFE",
          fontSize: 24,
          fontFamily: "Inter",
          showLegend: false,
          showGrid: false,
          showLabels: true,
        },
        position: { x: 2, y: 0 },
        size: { width: 300, height: 160 },
        value: dashboardMetrics.netProfit,
        trend: dashboardMetrics.netProfit > 0 ? "up" : "down",
        percentage: 15.2,
        description: "Profit margin and growth",
      },
      {
        id: "orders-metric",
        type: "metric",
        title: "Total Orders",
        dataSource: "orders",
        query: "SELECT COUNT(*) as count FROM orders",
        filters: [],
        styling: {
          colors: ["#8B5CF6"],
          backgroundColor: "#FAF5FF",
          borderColor: "#E9D5FF",
          fontSize: 20,
          fontFamily: "Inter",
          showLegend: false,
          showGrid: false,
          showLabels: true,
        },
        position: { x: 3, y: 0 },
        size: { width: 280, height: 140 },
        value: dashboardMetrics.totalOrders,
      },
      {
        id: "revenue-chart",
        type: "bar",
        title: "Revenue by Payment Method",
        dataSource: "orders",
        query:
          "SELECT payment_mode, SUM(total) FROM orders GROUP BY payment_mode",
        filters: [],
        styling: {
          colors: DEFAULT_COLORS,
          backgroundColor: "#ffffff",
          borderColor: "#e2e8f0",
          fontSize: 14,
          fontFamily: "Inter",
          showLegend: true,
          showGrid: true,
          showLabels: true,
        },
        position: { x: 0, y: 1 },
        size: { width: 500, height: 300 },
      },
      {
        id: "expenses-pie",
        type: "pie",
        title: "Expense Categories",
        dataSource: "expenses",
        query: "SELECT category, SUM(amount) FROM expenses GROUP BY category",
        filters: [],
        styling: {
          colors: DEFAULT_COLORS,
          backgroundColor: "#ffffff",
          borderColor: "#e2e8f0",
          fontSize: 14,
          fontFamily: "Inter",
          showLegend: true,
          showGrid: false,
          showLabels: true,
        },
        position: { x: 1, y: 1 },
        size: { width: 400, height: 300 },
      },
    ];
  };

  const saveDashboard = async () => {
    if (!currentDashboard || !user?.id) {
      toast.error("Cannot save dashboard: missing user information");
      return;
    }

    if (!dashboardName.trim()) {
      toast.error("Please enter a dashboard name");
      return;
    }

    try {
      const dashboardData = {
        user_id: user.id,
        name: dashboardName,
        description: dashboardDescription,
        calculation_config: JSON.stringify(currentDashboard.charts),
        is_active: true,
      };

      // Try to save to Supabase first, fallback to localStorage
      try {
        if (
          currentDashboard.id &&
          dashboards.find((d) => d.id === currentDashboard.id)
        ) {
          // Update existing
          const { error } = await supabase
            .from("custom_calculations")
            .update(dashboardData)
            .eq("id", currentDashboard.id);

          if (error) throw error;
        } else {
          // Create new
          const { data, error } = await supabase
            .from("custom_calculations")
            .insert(dashboardData)
            .select();

          if (error) throw error;
          if (data) {
            setCurrentDashboard((prev) =>
              prev ? { ...prev, id: data[0].id } : null,
            );
          }
        }
        toast.success("Dashboard saved to database");
      } catch (supabaseError) {
        console.warn(
          "Failed to save to Supabase, using localStorage:",
          supabaseError,
        );

        // Fallback to localStorage
        const updatedDashboard = {
          ...currentDashboard,
          name: dashboardName,
          description: dashboardDescription,
          updatedAt: new Date().toISOString(),
        };

        let existingDashboards = [];
        try {
          const stored = localStorage.getItem(`dashboards_${user.id}`);
          existingDashboards = stored ? JSON.parse(stored) : [];
        } catch (e) {
          console.error("Error parsing existing dashboards:", e);
        }

        const existingIndex = existingDashboards.findIndex(
          (d: any) => d.id === currentDashboard.id,
        );

        if (existingIndex >= 0) {
          existingDashboards[existingIndex] = updatedDashboard;
        } else {
          existingDashboards.push(updatedDashboard);
        }

        localStorage.setItem(
          `dashboards_${user.id}`,
          JSON.stringify(existingDashboards),
        );

        setDashboards(existingDashboards);
        toast.success("Dashboard saved to local storage");
      }

      setShowSaveDialog(false);
      loadDashboards();
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      console.error("Error saving dashboard:", errorMessage);
      toast.error(`Failed to save dashboard: ${errorMessage}`);
    }
  };

  const executeQuery = async (query: string, dataSource: string) => {
    if (!query.trim()) return;

    setIsQueryRunning(true);
    try {
      const { data, error } = await supabase
        .from(dataSource)
        .select("*")
        .limit(100);

      if (error) throw error;
      setQueryResults(data || []);
      toast.success(
        `Query executed successfully. ${data?.length || 0} rows returned.`,
      );
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      console.error("Error executing query:", errorMessage);
      toast.error(`Query execution failed: ${errorMessage}`);
      setQueryResults([]);
    } finally {
      setIsQueryRunning(false);
    }
  };

  const addChart = (type: string) => {
    if (!currentDashboard) return;

    let newChart: ChartConfig;

    if (type === "kpi_card") {
      newChart = {
        id: Date.now().toString(),
        type: "kpi_card",
        title: "New KPI",
        dataSource: DATA_SOURCES[0].table,
        query: `SELECT COUNT(*) as value FROM ${DATA_SOURCES[0].table}`,
        filters: [],
        styling: {
          colors: ["#3B82F6"],
          backgroundColor: "#EFF6FF",
          borderColor: "#BFDBFE",
          fontSize: 24,
          fontFamily: "Inter",
          showLegend: false,
          showGrid: false,
          showLabels: true,
        },
        position: { x: 0, y: 0 },
        size: { width: 300, height: 160 },
        value: 0,
        trend: "neutral",
        percentage: 0,
        description: "Key performance indicator",
      };
    } else {
      newChart = {
        id: Date.now().toString(),
        type: type as any,
        title: `New ${type} Chart`,
        dataSource: DATA_SOURCES[0].table,
        query: `SELECT * FROM ${DATA_SOURCES[0].table} LIMIT 10`,
        filters: [],
        styling: {
          colors: DEFAULT_COLORS,
          backgroundColor: "#ffffff",
          borderColor: "#e2e8f0",
          fontSize: 14,
          fontFamily: "Inter",
          showLegend: true,
          showGrid: true,
          showLabels: true,
        },
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
      };
    }

    setCurrentDashboard((prev) =>
      prev
        ? {
            ...prev,
            charts: [...prev.charts, newChart],
          }
        : null,
    );

    setSelectedChart(newChart);
    setIsCreatingChart(true);
  };

  const updateChart = (chartId: string, updates: Partial<ChartConfig>) => {
    if (!currentDashboard) return;

    setCurrentDashboard((prev) =>
      prev
        ? {
            ...prev,
            charts: prev.charts.map((chart) =>
              chart.id === chartId ? { ...chart, ...updates } : chart,
            ),
          }
        : null,
    );

    if (selectedChart?.id === chartId) {
      setSelectedChart((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const deleteChart = (chartId: string) => {
    if (!currentDashboard) return;

    setCurrentDashboard((prev) =>
      prev
        ? {
            ...prev,
            charts: prev.charts.filter((chart) => chart.id !== chartId),
          }
        : null,
    );

    if (selectedChart?.id === chartId) {
      setSelectedChart(null);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !currentDashboard) return;

    const newCharts = Array.from(currentDashboard.charts);
    const [reorderedChart] = newCharts.splice(result.source.index, 1);
    newCharts.splice(result.destination.index, 0, reorderedChart);

    setCurrentDashboard((prev) =>
      prev ? { ...prev, charts: newCharts } : null,
    );
  };

  const renderChart = (chart: ChartConfig) => {
    const ChartIcon =
      CHART_TYPES.find((t) => t.type === chart.type)?.icon || BarChart3;

    if (chart.type === "kpi_card") {
      return (
        <Card
          key={chart.id}
          className={`relative border-2 transition-all duration-200 hover:shadow-lg ${
            selectedChart?.id === chart.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200"
          }`}
          style={{
            width: chart.size.width,
            height: chart.size.height,
            backgroundColor: chart.styling.backgroundColor,
            borderColor: chart.styling.borderColor,
          }}
          onClick={() => setSelectedChart(chart)}
        >
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                {chart.title}
              </h3>
              {!previewMode && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChart(chart);
                      setIsCreatingChart(true);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChart(chart.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div
                  className="text-2xl font-bold"
                  style={{ color: chart.styling.colors[0] }}
                >
                  {chart.value
                    ? `NRs. ${chart.value.toLocaleString()}`
                    : "NRs. 0"}
                </div>
                {chart.percentage && (
                  <div className="flex items-center gap-1 text-sm">
                    {chart.trend === "up" && (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    )}
                    {chart.trend === "down" && (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={`${chart.trend === "up" ? "text-green-500" : "text-red-500"}`}
                    >
                      {chart.percentage}%
                    </span>
                    <span className="text-gray-500">vs last period</span>
                  </div>
                )}
              </div>
              <ChartIcon className="h-8 w-8 text-gray-400" />
            </div>
            {chart.description && (
              <p className="text-xs text-gray-500 mt-1">{chart.description}</p>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card
        key={chart.id}
        className={`relative border-2 transition-all duration-200 hover:shadow-md ${
          selectedChart?.id === chart.id
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200"
        }`}
        style={{
          width: chart.size.width,
          height: chart.size.height,
          backgroundColor: chart.styling.backgroundColor,
        }}
        onClick={() => setSelectedChart(chart)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ChartIcon className="h-4 w-4" />
              {chart.title}
            </CardTitle>
            {!previewMode && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChart(chart);
                    setIsCreatingChart(true);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChart(chart.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center h-32 bg-gray-50 rounded border-2 border-dashed border-gray-300">
            <div className="text-center text-gray-500">
              <ChartIcon className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Chart Preview</p>
              <p className="text-xs">{chart.dataSource}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ChartEditor = () => {
    if (!selectedChart) return null;

    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="chart-title">Chart Title</Label>
          <Input
            id="chart-title"
            value={selectedChart.title}
            onChange={(e) =>
              updateChart(selectedChart.id, { title: e.target.value })
            }
            placeholder="Enter chart title"
          />
        </div>

        {selectedChart.type === "kpi_card" && (
          <>
            <div>
              <Label htmlFor="kpi-value">KPI Value</Label>
              <Input
                id="kpi-value"
                type="number"
                value={selectedChart.value || 0}
                onChange={(e) =>
                  updateChart(selectedChart.id, {
                    value: parseFloat(e.target.value),
                  })
                }
                placeholder="Enter KPI value"
              />
            </div>
            <div>
              <Label htmlFor="kpi-trend">Trend</Label>
              <Select
                value={selectedChart.trend || "neutral"}
                onValueChange={(value) =>
                  updateChart(selectedChart.id, {
                    trend: value as "up" | "down" | "neutral",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">Trending Up</SelectItem>
                  <SelectItem value="down">Trending Down</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="kpi-percentage">Percentage Change</Label>
              <Input
                id="kpi-percentage"
                type="number"
                value={selectedChart.percentage || 0}
                onChange={(e) =>
                  updateChart(selectedChart.id, {
                    percentage: parseFloat(e.target.value),
                  })
                }
                placeholder="Percentage change"
              />
            </div>
            <div>
              <Label htmlFor="kpi-description">Description</Label>
              <Textarea
                id="kpi-description"
                value={selectedChart.description || ""}
                onChange={(e) =>
                  updateChart(selectedChart.id, { description: e.target.value })
                }
                placeholder="KPI description"
                rows={2}
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="data-source">Data Source</Label>
          <Select
            value={selectedChart.dataSource}
            onValueChange={(value) =>
              updateChart(selectedChart.id, { dataSource: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              {DATA_SOURCES.map((source) => (
                <SelectItem key={source.table} value={source.table}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="query">SQL Query</Label>
          <Textarea
            id="query"
            value={selectedChart.query}
            onChange={(e) =>
              updateChart(selectedChart.id, { query: e.target.value })
            }
            placeholder="SELECT * FROM table_name"
            rows={4}
          />
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={() =>
                executeQuery(selectedChart.query, selectedChart.dataSource)
              }
              disabled={isQueryRunning}
            >
              {isQueryRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Query
            </Button>
            <Badge variant="outline">{queryResults.length} rows</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="chart-width">Width</Label>
            <Input
              id="chart-width"
              type="number"
              value={selectedChart.size.width}
              onChange={(e) =>
                updateChart(selectedChart.id, {
                  size: {
                    ...selectedChart.size,
                    width: parseInt(e.target.value),
                  },
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="chart-height">Height</Label>
            <Input
              id="chart-height"
              type="number"
              value={selectedChart.size.height}
              onChange={(e) =>
                updateChart(selectedChart.id, {
                  size: {
                    ...selectedChart.size,
                    height: parseInt(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>

        <div>
          <Label>Styling Options</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={selectedChart.styling.showLegend}
                onCheckedChange={(checked) =>
                  updateChart(selectedChart.id, {
                    styling: { ...selectedChart.styling, showLegend: checked },
                  })
                }
              />
              <Label>Show Legend</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={selectedChart.styling.showGrid}
                onCheckedChange={(checked) =>
                  updateChart(selectedChart.id, {
                    styling: { ...selectedChart.styling, showGrid: checked },
                  })
                }
              />
              <Label>Show Grid</Label>
            </div>
          </div>
        </div>

        {queryResults.length > 0 && (
          <div>
            <Label>Query Results Preview</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded border max-h-40 overflow-auto">
              <pre className="text-xs">
                {JSON.stringify(queryResults.slice(0, 3), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  const MetricsOverview = () => {
    if (!dashboardMetrics) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600">Revenue</p>
                <p className="text-xl font-bold text-green-800">
                  NRs. {dashboardMetrics.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-red-600">Expenses</p>
                <p className="text-xl font-bold text-red-800">
                  NRs. {dashboardMetrics.totalExpenses.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">Net Profit</p>
                <p
                  className={`text-xl font-bold ${dashboardMetrics.netProfit >= 0 ? "text-blue-800" : "text-red-800"}`}
                >
                  NRs. {dashboardMetrics.netProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600">Orders</p>
                <p className="text-xl font-bold text-purple-800">
                  {dashboardMetrics.totalOrders.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600">Charging</p>
                <p className="text-xl font-bold text-orange-800">
                  {dashboardMetrics.chargingSessions.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
          <p className="text-gray-600">Loading Dashboard Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Analytics Studio
              </h1>
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            {currentDashboard && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                {currentDashboard.charts.length} components
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {previewMode ? "Edit Mode" : "Preview Mode"}
            </Button>
            {currentDashboard && (
              <Button
                onClick={() => setShowSaveDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Dashboard
              </Button>
            )}
            <Button
              onClick={createNewDashboard}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!previewMode && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <Tabs defaultValue="dashboards" className="h-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
                <TabsTrigger value="charts">Components</TabsTrigger>
                <TabsTrigger value="data">Data Sources</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboards" className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">My Dashboards</h3>
                  <Badge variant="outline">{dashboards.length} saved</Badge>
                </div>
                <ScrollArea className="h-96">
                  {dashboards.map((dashboard) => (
                    <Card
                      key={dashboard.id}
                      className={`mb-3 cursor-pointer transition-all hover:shadow-md ${
                        currentDashboard?.id === dashboard.id
                          ? "ring-2 ring-blue-500 bg-blue-50"
                          : ""
                      }`}
                      onClick={() => {
                        setCurrentDashboard(dashboard);
                        setDashboardName(dashboard.name);
                        setDashboardDescription(dashboard.description);
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          {dashboard.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {dashboard.charts.length} components •{" "}
                          {format(new Date(dashboard.updatedAt), "MMM dd")}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                  {dashboards.length === 0 && (
                    <div className="text-center py-8">
                      <Layout className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No dashboards yet</p>
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={createNewDashboard}
                      >
                        Create First Dashboard
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="charts" className="p-4 space-y-4">
                <h3 className="text-lg font-semibold">Add Component</h3>
                <div className="grid grid-cols-1 gap-2">
                  {CHART_TYPES.map((chartType) => {
                    const Icon = chartType.icon;
                    return (
                      <Button
                        key={chartType.type}
                        variant="outline"
                        className="justify-start h-auto p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
                        onClick={() => addChart(chartType.type)}
                        disabled={!currentDashboard}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">{chartType.label}</div>
                          <div className="text-xs text-gray-500">
                            {chartType.description}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>

                {selectedChart && (
                  <div className="mt-6">
                    <Separator className="mb-4" />
                    <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Component Properties
                    </h4>
                    <ChartEditor />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="data" className="p-4 space-y-4">
                <h3 className="text-lg font-semibold">Data Sources</h3>
                <ScrollArea className="h-96">
                  {DATA_SOURCES.map((source) => (
                    <Card key={source.table} className="mb-3">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          {source.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {source.fields.length} fields available
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {source.fields.slice(0, 6).map((field) => (
                            <Badge
                              key={field}
                              variant="secondary"
                              className="text-xs"
                            >
                              {field}
                            </Badge>
                          ))}
                          {source.fields.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{source.fields.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Main Canvas */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50">
          {currentDashboard ? (
            <div ref={canvasRef} className="p-6">
              {!previewMode && <MetricsOverview />}

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="dashboard-canvas">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="min-h-full"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentDashboard.charts.map((chart, index) => (
                          <Draggable
                            key={chart.id}
                            draggableId={chart.id}
                            index={index}
                            isDragDisabled={previewMode}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={
                                  snapshot.isDragging ? "opacity-75" : ""
                                }
                              >
                                {renderChart(chart)}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}

                      {currentDashboard.charts.length === 0 && (
                        <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg bg-white/50">
                          <div className="text-center text-gray-500">
                            <Sparkles className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-xl font-medium mb-2">
                              Create Your Analytics Dashboard
                            </h3>
                            <p className="text-sm mb-6 max-w-md">
                              Start building powerful data visualizations and
                              insights for your business. Add KPI cards, charts,
                              and metrics to track your performance.
                            </p>
                            {!previewMode && (
                              <div className="flex gap-2 justify-center">
                                <Button
                                  onClick={() => addChart("kpi_card")}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Target className="h-4 w-4 mr-2" />
                                  Add KPI Card
                                </Button>
                                <Button
                                  onClick={() => addChart("bar")}
                                  variant="outline"
                                >
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  Add Chart
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 max-w-md">
                <Brain className="h-20 w-20 mx-auto mb-4 text-gray-400" />
                <h3 className="text-2xl font-medium mb-3">
                  Welcome to Analytics Studio
                </h3>
                <p className="text-gray-600 mb-6">
                  Build comprehensive dashboards with real-time data
                  visualization, KPI tracking, and business intelligence
                  insights.
                </p>
                <Button
                  onClick={createNewDashboard}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Analytics Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Dashboard Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Dashboard
            </DialogTitle>
            <DialogDescription>
              Save your dashboard to access it later and share with others.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dashboard-name">Dashboard Name</Label>
              <Input
                id="dashboard-name"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                placeholder="Enter dashboard name"
              />
            </div>
            <div>
              <Label htmlFor="dashboard-description">Description</Label>
              <Textarea
                id="dashboard-description"
                value={dashboardDescription}
                onChange={(e) => setDashboardDescription(e.target.value)}
                placeholder="Describe what this dashboard shows"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveDashboard}>Save Dashboard</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardStudio;
