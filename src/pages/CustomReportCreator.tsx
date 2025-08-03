import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Save, Download, BarChart3 } from "lucide-react";

interface Filter {
  column: string;
  operator: string;
  value: string;
}

interface CustomCalculation {
  name: string;
  formula: string;
  columns: string[];
}

interface ReportConfig {
  table: string;
  columns: string[];
  filters: Filter[];
  calculations: CustomCalculation[];
}

const CustomReportCreator = () => {
  const { user } = useAuth();
  const [reportName, setReportName] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [calculations, setCalculations] = useState<CustomCalculation[]>([]);
  const [availableColumns, setAvailableColumns] = useState<Record<string, string[]>>({});
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const tables = [
    "orders",
    "charging_sessions", 
    "expenses",
    "deposits",
    "withdrawals",
    "cooperative_savings",
    "daily_summary"
  ];

  const operators = ["=", "!=", ">", "<", ">=", "<=", "LIKE", "NOT LIKE"];

  useEffect(() => {
    fetchTableColumns();
  }, []);

  const fetchTableColumns = async () => {
    try {
      const columnsMap: Record<string, string[]> = {};
      
      // Define columns for each table based on schema
      columnsMap.orders = ["id", "user_id", "item_name", "quantity", "rate", "total", "payment_mode", "order_date", "created_at"];
      columnsMap.charging_sessions = ["id", "user_id", "total_amount", "payment_mode", "session_date", "created_at"];
      columnsMap.expenses = ["id", "user_id", "description", "amount", "category", "payment_mode", "expense_date", "created_at"];
      columnsMap.deposits = ["id", "user_id", "amount", "mode", "deposited_by", "deposit_date", "created_at"];
      columnsMap.withdrawals = ["id", "user_id", "amount", "withdrawal_from", "payment_mode", "withdrawal_date", "created_at"];
      columnsMap.cooperative_savings = ["id", "user_id", "contribution_amount", "payment_mode", "contribution_date", "created_at"];
      columnsMap.daily_summary = ["id", "summary_date", "total_income", "total_expenses", "cash_balance", "created_at"];

      setAvailableColumns(columnsMap);
    } catch (error) {
      console.error("Error fetching table columns:", error);
      toast.error("Error loading table information");
    }
  };

  const addFilter = () => {
    setFilters([...filters, { column: "", operator: "=", value: "" }]);
  };

  const updateFilter = (index: number, field: keyof Filter, value: string) => {
    const newFilters = [...filters];
    newFilters[index][field] = value;
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const addCalculation = () => {
    setCalculations([...calculations, { name: "", formula: "", columns: [] }]);
  };

  const updateCalculation = (index: number, field: keyof CustomCalculation, value: string | string[]) => {
    const newCalculations = [...calculations];
    newCalculations[index][field] = value as any;
    setCalculations(newCalculations);
  };

  const removeCalculation = (index: number) => {
    setCalculations(calculations.filter((_, i) => i !== index));
  };

  const generateReport = async () => {
    if (!user || !selectedTable || selectedColumns.length === 0) {
      toast.error("Please select a table and at least one column");
      return;
    }

    setLoading(true);
    try {
      // Use type assertion to handle dynamic table selection
      const query = (supabase as any)
        .from(selectedTable)
        .select(selectedColumns.join(", "))
        .eq("user_id", user.id);

      // Apply filters safely
      let finalQuery = query;
      filters.forEach(filter => {
        if (filter.column && filter.operator && filter.value) {
          switch (filter.operator) {
            case "=":
              finalQuery = finalQuery.eq(filter.column, filter.value);
              break;
            case "!=":
              finalQuery = finalQuery.neq(filter.column, filter.value);
              break;
            case ">":
              finalQuery = finalQuery.gt(filter.column, filter.value);
              break;
            case "<":
              finalQuery = finalQuery.lt(filter.column, filter.value);
              break;
            case ">=":
              finalQuery = finalQuery.gte(filter.column, filter.value);
              break;
            case "<=":
              finalQuery = finalQuery.lte(filter.column, filter.value);
              break;
            case "LIKE":
              finalQuery = finalQuery.like(filter.column, `%${filter.value}%`);
              break;
            case "NOT LIKE":
              finalQuery = finalQuery.not(filter.column, "like", `%${filter.value}%`);
              break;
          }
        }
      });

      const { data, error } = await finalQuery;

      if (error) throw error;

      setReportData(data || []);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Error generating report");
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    if (!user || !reportName) {
      toast.error("Please enter a report name");
      return;
    }

    try {
      const reportConfig: ReportConfig = {
        table: selectedTable,
        columns: selectedColumns,
        filters: filters,
        calculations: calculations
      };

      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        report_type: "custom",
        report_data: reportConfig as any,
        date_range_start: new Date().toISOString().split('T')[0],
        date_range_end: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      toast.success("Report template saved successfully!");
      setReportName("");
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("Error saving report template");
    }
  };

  const exportReport = () => {
    if (reportData.length === 0) {
      toast.error("No data to export. Generate a report first.");
      return;
    }

    const csv = [
      selectedColumns.join(","),
      ...reportData.map(row =>
        selectedColumns.map(col => row[col] || "").join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportName || "custom_report"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Report exported successfully!");
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-pink-100 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Report Creator</h1>
          <p className="text-gray-600">Build and customize your own reports</p>
        </div>
        <BarChart3 className="h-8 w-8 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reportName">Report Name</Label>
                <Input
                  id="reportName"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name"
                />
              </div>

              <div>
                <Label htmlFor="table">Select Table</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map(table => (
                      <SelectItem key={table} value={table}>{table}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTable && (
                <div>
                  <Label>Select Columns</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableColumns[selectedTable]?.map(column => (
                      <div key={column} className="flex items-center space-x-2">
                        <Checkbox
                          id={column}
                          checked={selectedColumns.includes(column)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, column]);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== column));
                            }
                          }}
                        />
                        <Label htmlFor={column} className="text-sm">{column}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Filters
                <Button onClick={addFilter} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Filter
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filters.map((filter, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={filter.column}
                      onValueChange={(value) => updateFilter(index, "column", value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Column" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTable && availableColumns[selectedTable]?.map(column => (
                          <SelectItem key={column} value={column}>{column}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateFilter(index, "operator", value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(op => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      value={filter.value}
                      onChange={(e) => updateFilter(index, "value", e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                    />

                    <Button
                      onClick={() => removeFilter(index)}
                      size="sm"
                      variant="outline"
                      className="px-2"
                    >
                      ×
                    </Button>
                  </div>
                ))}

                {filters.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No filters added. Click "Add Filter" to add filtering conditions.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={generateReport} 
                className="w-full" 
                disabled={loading || !selectedTable || selectedColumns.length === 0}
              >
                {loading ? "Generating..." : "Generate Report"}
              </Button>
              <Button onClick={saveReport} variant="outline" className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              <Button 
                onClick={exportReport} 
                variant="outline" 
                className="w-full"
                disabled={reportData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span>{selectedTable || "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Columns:</span>
                  <span>{selectedColumns.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Filters:</span>
                  <span>{filters.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Records:</span>
                  <span>{reportData.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report Results */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    {selectedColumns.map(column => (
                      <th key={column} className="border border-gray-300 px-4 py-2 text-left">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {selectedColumns.map(column => (
                        <td key={column} className="border border-gray-300 px-4 py-2">
                          {row[column]?.toString() || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomReportCreator;
