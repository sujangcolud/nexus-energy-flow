import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  Calculator,
  Plus,
  Edit,
  Trash2,
  Play,
  Save,
  Eye,
  Settings,
  TrendingUp,
  DollarSign,
  Percent,
  Hash,
  Sparkles,
} from "lucide-react";

interface CalculationConfig {
  formula: string;
  tables: string[];
  columns: string[];
  filters: Record<string, any>;
  aggregations: string[];
}

interface CustomCalculation {
  id: string;
  name: string;
  description: string;
  calculation_config: CalculationConfig;
  result_cache: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TableColumn {
  table: string;
  column: string;
  type: string;
  label: string;
}

const CalculationEngineTab = () => {
  const { user } = useAuth();
  const [calculations, setCalculations] = useState<CustomCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCalculation, setSelectedCalculation] =
    useState<CustomCalculation | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    formula: "",
    selectedTables: [] as string[],
    selectedColumns: [] as string[],
    filters: {} as Record<string, any>,
    aggregations: [] as string[],
  });

  // Available tables and columns for calculation building
  const availableTables = [
    {
      value: "orders",
      label: "Orders",
      columns: ["total", "quantity", "rate", "payment_mode", "order_date"],
    },
    {
      value: "charging_sessions",
      label: "Charging Sessions",
      columns: [
        "total_amount",
        "start_percentage",
        "end_percentage",
        "kcal",
        "payment_mode",
        "session_date",
      ],
    },
    {
      value: "expenses",
      label: "Expenses",
      columns: ["amount", "category", "payment_mode", "expense_date"],
    },
    {
      value: "deposits",
      label: "Deposits",
      columns: ["amount", "mode", "deposit_date"],
    },
    {
      value: "withdrawals",
      label: "Withdrawals",
      columns: ["amount", "purpose", "payment_mode", "withdrawal_date"],
    },
    {
      value: "cooperative_savings",
      label: "Cooperative Savings",
      columns: ["contribution_amount", "member_id", "contribution_date"],
    },
    {
      value: "vat_entries",
      label: "VAT Entries",
      columns: ["amount", "vat_amount", "total_with_vat", "vat_rate"],
    },
    {
      value: "inventory",
      label: "Inventory",
      columns: ["quantity", "unit_cost", "total_cost", "minimum_stock"],
    },
  ];

  const aggregationFunctions = [
    { value: "SUM", label: "Sum" },
    { value: "AVG", label: "Average" },
    { value: "COUNT", label: "Count" },
    { value: "MAX", label: "Maximum" },
    { value: "MIN", label: "Minimum" },
  ];

  const operatorTypes = [
    { value: "+", label: "Add (+)" },
    { value: "-", label: "Subtract (-)" },
    { value: "*", label: "Multiply (×)" },
    { value: "/", label: "Divide (÷)" },
    { value: "%", label: "Percentage (%)" },
  ];

  useEffect(() => {
    if (user) {
      fetchCalculations();
    }
  }, [user]);

  const fetchCalculations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("custom_calculations")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCalculations(data || []);
    } catch (error) {
      console.error("Error fetching calculations:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to load calculations";
      toast.error(`Error fetching calculations: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const saveCalculation = async () => {
    if (!user || !formData.name || !formData.formula) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const calculationConfig: CalculationConfig = {
        formula: formData.formula,
        tables: formData.selectedTables,
        columns: formData.selectedColumns,
        filters: formData.filters,
        aggregations: formData.aggregations,
      };

      const calculationData = {
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        calculation_config: calculationConfig,
        is_active: true,
      };

      if (isEditing && selectedCalculation) {
        const { error } = await supabase
          .from("custom_calculations")
          .update(calculationData)
          .eq("id", selectedCalculation.id);

        if (error) throw error;
        toast.success("Calculation updated successfully!");
      } else {
        const { error } = await supabase
          .from("custom_calculations")
          .insert(calculationData);

        if (error) throw error;
        toast.success("Calculation created successfully!");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCalculations();
    } catch (error) {
      console.error("Error saving calculation:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to save calculation";
      toast.error(`Error saving calculation: ${errorMessage}`);
    }
  };

  const executeCalculation = async (calculation: CustomCalculation) => {
    if (!user) return;

    try {
      const config = calculation.calculation_config;
      let query = "";

      // Build dynamic SQL query based on configuration
      if (config.aggregations.length > 0) {
        const aggregationParts = config.aggregations.map(
          (agg) => `${agg.split("(")[0]}(${agg.split("(")[1]}`,
        );
        query = `SELECT ${aggregationParts.join(", ")} FROM ${config.tables[0]}`;
      } else {
        query = `SELECT ${config.columns.join(", ")} FROM ${config.tables[0]}`;
      }

      // Add user filter
      query += ` WHERE user_id = '${user.id}'`;

      // Add date filters if specified
      if (config.filters.date_from) {
        const dateColumn = getDateColumnForTable(config.tables[0]);
        query += ` AND ${dateColumn} >= '${config.filters.date_from}'`;
      }
      if (config.filters.date_to) {
        const dateColumn = getDateColumnForTable(config.tables[0]);
        query += ` AND ${dateColumn} <= '${config.filters.date_to}'`;
      }

      const { data, error } = await supabase.rpc("execute_custom_query", {
        query_text: query,
      });

      if (error) throw error;

      // Cache the result
      const { error: updateError } = await supabase
        .from("custom_calculations")
        .update({
          result_cache: data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", calculation.id);

      if (updateError) throw updateError;

      toast.success("Calculation executed successfully!");
      fetchCalculations();
    } catch (error) {
      console.error("Error executing calculation:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to execute calculation";
      toast.error(`Error executing calculation: ${errorMessage}`);
    }
  };

  const getDateColumnForTable = (table: string): string => {
    const dateColumns: Record<string, string> = {
      orders: "order_date",
      charging_sessions: "session_date",
      expenses: "expense_date",
      deposits: "deposit_date",
      withdrawals: "withdrawal_date",
      cooperative_savings: "contribution_date",
    };
    return dateColumns[table] || "created_at";
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      formula: "",
      selectedTables: [],
      selectedColumns: [],
      filters: {},
      aggregations: [],
    });
    setIsEditing(false);
    setSelectedCalculation(null);
  };

  const editCalculation = (calculation: CustomCalculation) => {
    setSelectedCalculation(calculation);
    setFormData({
      name: calculation.name,
      description: calculation.description,
      formula: calculation.calculation_config.formula,
      selectedTables: calculation.calculation_config.tables,
      selectedColumns: calculation.calculation_config.columns,
      filters: calculation.calculation_config.filters,
      aggregations: calculation.calculation_config.aggregations,
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const deleteCalculation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("custom_calculations")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      toast.success("Calculation deleted successfully!");
      fetchCalculations();
    } catch (error) {
      console.error("Error deleting calculation:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to delete calculation";
      toast.error(`Error deleting calculation: ${errorMessage}`);
    }
  };

  const buildFormulaFromDropdowns = () => {
    if (
      formData.selectedTables.length === 0 ||
      formData.aggregations.length === 0
    ) {
      return;
    }

    const table = formData.selectedTables[0];
    const aggregation = formData.aggregations[0];
    const formula = `${aggregation} FROM ${table} WHERE user_id = current_user_id()`;

    setFormData((prev) => ({ ...prev, formula }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full animate-spin mx-auto flex items-center justify-center">
            <Calculator className="h-8 w-8 text-white" />
          </div>
          <p className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Loading Calculation Engine...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-purple-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-xl animate-pulse">
              <Calculator className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Calculation Engine
            </h1>
            <Sparkles className="h-8 w-8 text-blue-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create custom calculations with dropdown builders for comprehensive
            business analysis
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Calculation
          </Button>
        </div>

        {/* Calculations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {calculations.map((calculation, index) => (
            <Card
              key={calculation.id}
              className="bg-gradient-to-br from-white/90 to-purple-50/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    {calculation.name}
                  </span>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {calculation.calculation_config.tables.length} tables
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  {calculation.description}
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Formula:</p>
                  <code className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto">
                    {calculation.calculation_config.formula}
                  </code>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Tables:</p>
                  <div className="flex flex-wrap gap-1">
                    {calculation.calculation_config.tables.map((table) => (
                      <Badge key={table} variant="outline" className="text-xs">
                        {table}
                      </Badge>
                    ))}
                  </div>
                </div>

                {calculation.result_cache && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-700">
                      Last Result:
                    </p>
                    <div className="bg-green-50 p-2 rounded">
                      <pre className="text-xs text-green-800 overflow-x-auto">
                        {JSON.stringify(calculation.result_cache, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    size="sm"
                    onClick={() => executeCalculation(calculation)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Execute
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editCalculation(calculation)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteCalculation(calculation.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {calculations.length === 0 && (
          <div className="text-center py-12">
            <Calculator className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl font-semibold text-gray-700 mb-2">
              No calculations created yet
            </p>
            <p className="text-gray-500">
              Create your first custom calculation to get started with business
              analysis
            </p>
          </div>
        )}

        {/* Creation/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Calculation" : "Create New Calculation"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Calculation Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter calculation name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe what this calculation does"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="tables">Select Tables</Label>
                  <Select
                    value={formData.selectedTables[0] || ""}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        selectedTables: [value],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a table" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTables.map((table) => (
                        <SelectItem key={table.value} value={table.value}>
                          {table.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="aggregation">Aggregation Function</Label>
                  <Select
                    value={formData.aggregations[0] || ""}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        aggregations: [value],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose aggregation" />
                    </SelectTrigger>
                    <SelectContent>
                      {aggregationFunctions.map((func) => (
                        <SelectItem key={func.value} value={func.value}>
                          {func.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Formula Builder */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="columns">Available Columns</Label>
                  {formData.selectedTables[0] && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableTables
                        .find((t) => t.value === formData.selectedTables[0])
                        ?.columns.map((column) => (
                          <Button
                            key={column}
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                selectedColumns: [
                                  ...prev.selectedColumns,
                                  column,
                                ],
                              }))
                            }
                          >
                            {column}
                          </Button>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="formula">SQL Formula *</Label>
                  <Textarea
                    id="formula"
                    value={formData.formula}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        formula: e.target.value,
                      }))
                    }
                    placeholder="Enter SQL formula (e.g., SUM(total) FROM orders WHERE payment_mode = 'cash')"
                    rows={4}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={buildFormulaFromDropdowns}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Build Formula from Selections
                </Button>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveCalculation}>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "Update" : "Create"} Calculation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CalculationEngineTab;
