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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/utils/errorHandling";

// Types for dashboard components
interface ChartConfig {
  id: string;
  type: "bar" | "line" | "pie" | "table" | "metric" | "gauge";
  title: string;
  dataSource: string;
  query: string;
  filters: FilterConfig[];
  styling: ChartStyling;
  position: { x: number; y: number };
  size: { width: number; height: number };
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
    fields: [
      "id",
      "amount",
      "purpose",
      "withdrawal_from",
      "cooperative_member_id",
      "withdrawal_date",
      "created_at",
    ],
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
    type: "table",
    icon: TableIcon,
    label: "Data Table",
    description: "Display raw data in tabular format",
  },
  {
    type: "metric",
    icon: TrendingUp,
    label: "Metric Card",
    description: "Show single key metric",
  },
  {
    type: "gauge",
    icon: Calendar,
    label: "Gauge Chart",
    description: "Display progress or performance",
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
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load saved dashboards when user is available
  useEffect(() => {
    if (user?.id) {
      loadDashboards();
    }
  }, [user?.id]);

  const loadDashboards = async () => {
    // Don't load if user is not available yet
    if (!user?.id) {
      console.log("User not available, skipping dashboard load");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("custom_calculations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      const parsedDashboards =
        data?.map((item) => {
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
            console.error(
              "Error parsing dashboard config for item:",
              item.id,
              parseError,
            );
            // Return dashboard with empty charts if parsing fails
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
        }) || [];

      setDashboards(parsedDashboards);
      console.log("Successfully loaded", parsedDashboards.length, "dashboards");
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      console.error("Error loading dashboards:", errorMessage, error);
      toast.error(`Failed to load dashboards: ${errorMessage}`);
      // Set empty array on error to prevent undefined state
      setDashboards([]);
    }
  };

  const createNewDashboard = () => {
    const newDashboard: Dashboard = {
      id: Date.now().toString(),
      name: "Untitled Dashboard",
      description: "",
      charts: [],
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

      toast.success("Dashboard saved successfully");
      setShowSaveDialog(false);
      loadDashboards();
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      console.error("Error saving dashboard:", errorMessage, error);
      toast.error(`Failed to save dashboard: ${errorMessage}`);
    }
  };

  const executeQuery = async (query: string, dataSource: string) => {
    if (!query.trim()) return;

    setIsQueryRunning(true);
    try {
      // Simple query execution - in a real implementation, you'd want more sophisticated SQL parsing
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
      console.error("Error executing query:", errorMessage, error);
      toast.error(`Query execution failed: ${errorMessage}`);
      setQueryResults([]);
    } finally {
      setIsQueryRunning(false);
    }
  };

  const addChart = (type: string) => {
    if (!currentDashboard) return;

    const newChart: ChartConfig = {
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard Studio
            </h1>
            {currentDashboard && (
              <Badge variant="outline">
                {currentDashboard.charts.length} charts
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
            {currentDashboard && (
              <Button onClick={() => setShowSaveDialog(true)}>
                <Save className="h-4 w-4 mr-2" />
                Save Dashboard
              </Button>
            )}
            <Button onClick={createNewDashboard}>
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
                <TabsTrigger value="charts">Charts</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboards" className="p-4 space-y-4">
                <h3 className="text-lg font-semibold">My Dashboards</h3>
                <ScrollArea className="h-64">
                  {dashboards.map((dashboard) => (
                    <Card
                      key={dashboard.id}
                      className={`mb-2 cursor-pointer transition-all ${
                        currentDashboard?.id === dashboard.id
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                      onClick={() => {
                        setCurrentDashboard(dashboard);
                        setDashboardName(dashboard.name);
                        setDashboardDescription(dashboard.description);
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {dashboard.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {dashboard.charts.length} charts
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="charts" className="p-4 space-y-4">
                <h3 className="text-lg font-semibold">Add Chart</h3>
                <div className="grid grid-cols-1 gap-2">
                  {CHART_TYPES.map((chartType) => {
                    const Icon = chartType.icon;
                    return (
                      <Button
                        key={chartType.type}
                        variant="outline"
                        className="justify-start h-auto p-3"
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
                    <h4 className="text-md font-semibold mb-4">
                      Chart Properties
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
        <div className="flex-1 overflow-auto">
          {currentDashboard ? (
            <div ref={canvasRef} className="p-6">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="dashboard-canvas">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="min-h-full"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentDashboard.charts.map((chart, index) => (
                          <Draggable
                            key={chart.id}
                            draggableId={chart.id}
                            index={index}
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
                        <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
                          <div className="text-center text-gray-500">
                            <Grid3X3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium mb-2">
                              Empty Dashboard
                            </h3>
                            <p className="text-sm mb-4">
                              Start by adding charts from the sidebar
                            </p>
                            {!previewMode && (
                              <Button onClick={() => addChart("bar")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Chart
                              </Button>
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
              <div className="text-center text-gray-500">
                <Layout className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">
                  No Dashboard Selected
                </h3>
                <p className="text-sm mb-4">
                  Create a new dashboard or select an existing one
                </p>
                <Button onClick={createNewDashboard}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Dashboard
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
            <DialogTitle>Save Dashboard</DialogTitle>
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
