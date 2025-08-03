import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Save,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
} from 'recharts';

interface DashboardWidget {
  id: string;
  name: string;
  type: string;
  config: any;
  user_id: string;
}

const DashboardStudio = () => {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [calculations, setCalculations] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchWidgets();
      fetchAvailableMetrics();
    }
  }, [user]);

  const fetchWidgets = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setWidgets(data || []);
    } catch (error) {
      console.error("Error fetching widgets:", error);
      toast.error("Failed to load widgets");
    }
  };

  const fetchAvailableMetrics = async () => {
    try {
      // Fetch column names from a specific table (e.g., 'daily_summary')
      const { data, error } = await supabase.rpc('get_all_table_columns');

      if (error) throw error;

      // Extract column names from the result
      const columnNames = data as string[];
      setAvailableMetrics(columnNames || []);
    } catch (error) {
      console.error("Error fetching available metrics:", error);
      toast.error("Failed to load available metrics");
    }
  };

  const addWidget = () => {
    const newWidget: DashboardWidget = {
      id: Math.random().toString(36).substring(7),
      name: "New Widget",
      type: "chart",
      config: {
        metrics: [],
        chartType: "bar",
      },
      user_id: user?.id || "",
    };
    setWidgets([...widgets, newWidget]);
  };

  const editWidget = (widget: DashboardWidget) => {
    setSelectedWidget(widget);
    setIsConfiguring(true);
  };

  const saveWidget = async (widget: DashboardWidget) => {
    try {
      const { error } = await supabase
        .from('reports')
        .upsert(widget, { onConflict: 'id' });

      if (error) throw error;

      toast.success("Widget saved successfully!");
      setIsConfiguring(false);
      fetchWidgets();
    } catch (error) {
      console.error("Error saving widget:", error);
      toast.error("Failed to save widget");
    }
  };

  const deleteWidget = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Widget deleted successfully!");
      fetchWidgets();
    } catch (error) {
      console.error("Error deleting widget:", error);
      toast.error("Failed to delete widget");
    }
  };

  const handleConfigChange = (config: any) => {
    if (selectedWidget) {
      setSelectedWidget({ ...selectedWidget, config: config });
    }
  };

  const generateChartData = (metrics: string[]) => {
    const data = [];
    for (let i = 0; i < 10; i++) {
      const entry: any = { name: `Day ${i + 1}` };
      metrics.forEach(metric => {
        entry[metric] = Math.random() * 100;
      });
      data.push(entry);
    }
    return data;
  };

  const renderWidgetContent = (widget: DashboardWidget) => {
    switch (widget.type) {
      case "chart":
        const chartData = generateChartData(widget.config.metrics || ["total_income"]);
        return (
          <ResponsiveContainer width="100%" height={300}>
            {widget.config.chartType === "area" && (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
              </AreaChart>
            )}
            {widget.config.chartType === "line" && (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            )}
            {(widget.config.chartType === "bar" || !widget.config.chartType) && (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            )}
            {widget.config.chartType === "pie" && (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                />
                <Tooltip />
              </PieChart>
            )}
          </ResponsiveContainer>
        );
      case "table":
        return <div>Table Widget</div>;
      case "metric":
        return <div>Metric Widget</div>;
      default:
        return <div>Unknown widget type</div>;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard Studio</h1>

      <div className="flex justify-end mb-4">
        <Button onClick={addWidget}>Add Widget</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((widget) => (
          <Card key={widget.id}>
            <CardHeader>
              <CardTitle>{widget.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderWidgetContent(widget)}
              <div className="flex justify-between mt-4">
                <Button size="sm" onClick={() => editWidget(widget)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteWidget(widget.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Widget Configuration</DialogTitle>
          </DialogHeader>
          {selectedWidget && (
            <WidgetConfiguration
              widget={selectedWidget}
              availableMetrics={availableMetrics}
              onConfigChange={handleConfigChange}
              onSave={() => saveWidget(selectedWidget)}
              onCancel={() => setIsConfiguring(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface WidgetConfigurationProps {
  widget: DashboardWidget;
  availableMetrics: string[];
  onConfigChange: (config: any) => void;
  onSave: () => void;
  onCancel: () => void;
}

const WidgetConfiguration: React.FC<WidgetConfigurationProps> = ({
  widget,
  availableMetrics,
  onConfigChange,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(widget.name);
  const [metrics, setMetrics] = useState<string[]>(widget.config.metrics || []);
  const [chartType, setChartType] = useState(widget.config.chartType || "bar");

  useEffect(() => {
    setName(widget.name);
    setMetrics(widget.config.metrics || []);
    setChartType(widget.config.chartType || "bar");
  }, [widget]);

  const handleMetricToggle = (metric: string) => {
    if (metrics.includes(metric)) {
      setMetrics(metrics.filter((m) => m !== metric));
    } else {
      setMetrics([...metrics, metric]);
    }
  };

  const handleChartTypeChange = (type: string) => {
    setChartType(type);
  };

  const handleSave = () => {
    const newConfig = {
      metrics: metrics,
      chartType: chartType,
    };
    onConfigChange(newConfig);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="widgetName">Widget Name</Label>
        <Input
          id="widgetName"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <Label>Metrics</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {availableMetrics.map((metric) => (
            <Button
              key={metric}
              variant={metrics.includes(metric) ? "default" : "outline"}
              onClick={() => handleMetricToggle(metric)}
              size="sm"
            >
              {metric}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label>Chart Type</Label>
        <div className="flex space-x-2">
          <Button
            variant={chartType === "bar" ? "default" : "outline"}
            onClick={() => handleChartTypeChange("bar")}
            size="sm"
          >
            <BarChartIcon className="h-4 w-4 mr-2" />
            Bar
          </Button>
          <Button
            variant={chartType === "line" ? "default" : "outline"}
            onClick={() => handleChartTypeChange("line")}
            size="sm"
          >
            <LineChartIcon className="h-4 w-4 mr-2" />
            Line
          </Button>
          <Button
            variant={chartType === "area" ? "default" : "outline"}
            onClick={() => handleChartTypeChange("area")}
            size="sm"
          >
            <AreaChartIcon className="h-4 w-4 mr-2" />
            Area
          </Button>
          <Button
            variant={chartType === "pie" ? "default" : "outline"}
            onClick={() => handleChartTypeChange("pie")}
            size="sm"
          >
            <PieChartIcon className="h-4 w-4 mr-2" />
            Pie
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </DialogFooter>
    </div>
  );
};

export default DashboardStudio;
