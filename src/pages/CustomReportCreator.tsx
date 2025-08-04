
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2, Calculator, FileText } from "lucide-react";

interface CustomCalculation {
  [key: string]: any;
  id: string;
  name: string;
  formula: string;
  result?: number;
}

interface Filter {
  [key: string]: any;
  field: string;
  operator: string;
  value: string;
}

const CustomReportCreator = () => {
  const { user } = useAuth();
  const [reportName, setReportName] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<Record<string, string[]>>({});
  const [customCalculations, setCustomCalculations] = useState<CustomCalculation[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(false);

  const availableTables = [
    "orders",
    "expenses",
    "deposits",
    "withdrawals",
    "charging_sessions",
    "cooperative_savings"
  ];

  useEffect(() => {
    if (selectedTables.length > 0) {
      fetchTableColumns();
    }
  }, [selectedTables]);

  const fetchTableColumns = async () => {
    try {
      const columnsData: Record<string, string[]> = {};
      
      for (const tableName of selectedTables) {
        const { data, error } = await supabase
          .from(tableName as any)
          .select("*")
          .limit(1);
        
        if (error) {
          console.error(`Error fetching columns for ${tableName}:`, error);
          continue;
        }
        
        if (data && data.length > 0) {
          columnsData[tableName] = Object.keys(data[0]);
        } else {
          // Default columns if no data exists
          columnsData[tableName] = ['id', 'created_at', 'user_id'];
        }
      }
      
      setAvailableColumns(columnsData);
    } catch (error) {
      console.error("Error fetching table columns:", error);
      toast.error("Failed to fetch table columns");
    }
  };

  const addCustomCalculation = () => {
    const newCalculation: CustomCalculation = {
      id: Date.now().toString(),
      name: "",
      formula: ""
    };
    setCustomCalculations([...customCalculations, newCalculation]);
  };

  const updateCustomCalculation = (id: string, field: string, value: string) => {
    setCustomCalculations(prev =>
      prev.map(calc =>
        calc.id === id ? { ...calc, [field]: value } : calc
      )
    );
  };

  const removeCustomCalculation = (id: string) => {
    setCustomCalculations(prev => prev.filter(calc => calc.id !== id));
  };

  const addFilter = () => {
    const newFilter: Filter = {
      field: "",
      operator: "=",
      value: ""
    };
    setFilters([...filters, newFilter]);
  };

  const updateFilter = (index: number, field: string, value: string) => {
    setFilters(prev =>
      prev.map((filter, i) =>
        i === index ? { ...filter, [field]: value } : filter
      )
    );
  };

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const generateReport = async () => {
    if (!reportName || selectedTables.length === 0) {
      toast.error("Please enter report name and select at least one table");
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        name: reportName,
        tables: selectedTables,
        columns: availableColumns,
        calculations: customCalculations,
        filters: filters,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("reports")
        .insert({
          user_id: user?.id,
          report_type: "custom",
          report_data: reportData as any,
          date_range_start: new Date().toISOString().split('T')[0],
          date_range_end: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast.success("Custom report created successfully!");
      
      // Reset form
      setReportName("");
      setSelectedTables([]);
      setAvailableColumns({});
      setCustomCalculations([]);
      setFilters([]);
    } catch (error) {
      console.error("Error creating custom report:", error);
      toast.error("Failed to create custom report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Custom Report Creator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <Label>Select Tables</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableTables.map((table) => (
                <Button
                  key={table}
                  variant={selectedTables.includes(table) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedTables(prev =>
                      prev.includes(table)
                        ? prev.filter(t => t !== table)
                        : [...prev, table]
                    );
                  }}
                >
                  {table}
                </Button>
              ))}
            </div>
          </div>

          {Object.keys(availableColumns).length > 0 && (
            <div>
              <Label>Available Columns</Label>
              <div className="mt-2 space-y-2">
                {Object.entries(availableColumns).map(([table, columns]) => (
                  <div key={table}>
                    <h4 className="font-medium text-sm text-gray-700">{table}</h4>
                    <div className="flex flex-wrap gap-1">
                      {columns.map((column) => (
                        <Badge key={column} variant="secondary" className="text-xs">
                          {column}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Custom Calculations</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomCalculation}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Calculation
              </Button>
            </div>
            <div className="space-y-3">
              {customCalculations.map((calculation) => (
                <div key={calculation.id} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      placeholder="Calculation name"
                      value={calculation.name}
                      onChange={(e) => updateCustomCalculation(calculation.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="flex-2">
                    <Input
                      placeholder="Formula (e.g., SUM(orders.total))"
                      value={calculation.formula}
                      onChange={(e) => updateCustomCalculation(calculation.id, "formula", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeCustomCalculation(calculation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Filters</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFilter}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Filter
              </Button>
            </div>
            <div className="space-y-3">
              {filters.map((filter, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select
                      value={filter.field}
                      onValueChange={(value) => updateFilter(index, "field", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(availableColumns).map(([table, columns]) =>
                          columns.map((column) => (
                            <SelectItem key={`${table}.${column}`} value={`${table}.${column}`}>
                              {table}.{column}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateFilter(index, "operator", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="=">=</SelectItem>
                        <SelectItem value="!=">!=</SelectItem>
                        <SelectItem value=">">{'>'}</SelectItem>
                        <SelectItem value="<">{'<'}</SelectItem>
                        <SelectItem value=">=">{'>='}</SelectItem>
                        <SelectItem value="<=">{' <='}</SelectItem>
                        <SelectItem value="LIKE">LIKE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Value"
                      value={filter.value}
                      onChange={(e) => updateFilter(index, "value", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFilter(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={generateReport} disabled={loading} className="w-full">
            <Calculator className="h-4 w-4 mr-2" />
            {loading ? "Generating..." : "Generate Custom Report"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomReportCreator;
