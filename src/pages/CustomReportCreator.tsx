import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const CustomReportCreator = () => {
  const { user } = useAuth();
  const [reportName, setReportName] = useState("");
  const [dataSources, setDataSources] = useState<string[]>([]);
  const [joins, setJoins] = useState<{ fromTable: string; fromColumn: string; toTable: string; toColumn: string }[]>([]);
  const [calculationType, setCalculationType] = useState("");
  const [calculationColumn, setCalculationColumn] = useState("");
  const [filters, setFilters] = useState<{ column: string; operator: string; value: string }[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [allColumns, setAllColumns] = useState<Record<string, string[]>>({});

  const allDataSources = ["orders", "charging_sessions", "expenses", "deposits", "withdrawals", "cooperative_savings"];
  const calculationTypes = ["sum", "average", "count", "min", "max"];
  const operators = ["=", "!=", ">", "<", ">=", "<="];

  useEffect(() => {
    const fetchAllColumns = async () => {
      const { data, error } = await supabase.rpc('get_all_table_columns');
      if (error) {
        console.error("Error fetching all columns:", error);
      } else {
        setAllColumns(data);
      }
    };
    fetchAllColumns();
  }, []);

  useEffect(() => {
    const newColumns: string[] = [];
    dataSources.forEach((source) => {
      if (allColumns[source]) {
        newColumns.push(...allColumns[source].map((col) => `${source}.${col}`));
      }
    });
    setColumns(newColumns);
  }, [dataSources, allColumns]);

  const handleAddDataSource = () => {
    setDataSources([...dataSources, ""]);
  };

  const handleDataSourceChange = (index: number, value: string) => {
    const newDataSources = [...dataSources];
    newDataSources[index] = value;
    setDataSources(newDataSources);
  };

  const handleAddJoin = () => {
    setJoins([...joins, { fromTable: "", fromColumn: "", toTable: "", toColumn: "" }]);
  };

  const handleJoinChange = (index: number, field: string, value: string) => {
    const newJoins = [...joins];
    newJoins[index] = { ...newJoins[index], [field]: value };
    setJoins(newJoins);
  };

  const handleAddFilter = () => {
    setFilters([...filters, { column: "", operator: "", value: "" }]);
  };

  const handleFilterChange = (index: number, field: string, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const handleSaveLogic = async () => {
    if (!reportName || dataSources.length === 0 || !calculationType || !calculationColumn) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const { error } = await supabase.from("custom_reports").insert({
        user_id: user!.id,
        name: reportName,
        data_sources: dataSources,
        joins: joins.map(j => `${j.fromTable}.${j.fromColumn} = ${j.toTable}.${j.toColumn}`),
        calculation_type: calculationType,
        calculation_column: calculationColumn,
        filters: filters,
      });

      if (error) throw error;

      toast.success("Custom report logic saved successfully!");
      setReportName("");
      setDataSources([]);
      setJoins([]);
      setCalculationType("");
      setCalculationColumn("");
      setFilters([{ column: "", operator: "", value: "" }]);
    } catch (error) {
      console.error("Error saving custom report logic:", error);
      toast.error("Failed to save custom report logic.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Report</CardTitle>
          <CardDescription>
            Define your own analytics logic to generate custom reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportName">Report Name</Label>
            <Input
              id="reportName"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="e.g., 'Total revenue from cash orders'"
            />
          </div>

          <div>
            <Label>Data Sources</Label>
            {dataSources.map((source, index) => (
              <div key={index} className="flex items-center gap-2 mt-2">
                <Select
                  value={source}
                  onValueChange={(value) => handleDataSourceChange(index, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    {allDataSources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setDataSources(dataSources.filter((_, i) => i !== index))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button onClick={handleAddDataSource} variant="outline" size="sm" className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </Button>
          </div>

          <div>
            <Label>Joins</Label>
            {joins.map((join, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 mt-2">
                <Select
                  value={join.fromTable}
                  onValueChange={(value) => handleJoinChange(index, "fromTable", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="From Table" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((ds) => (
                      <SelectItem key={ds} value={ds}>
                        {ds}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={join.fromColumn}
                  onValueChange={(value) => handleJoinChange(index, "fromColumn", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="From Column" />
                  </SelectTrigger>
                  <SelectContent>
                    {(allColumns[join.fromTable] || []).map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={join.toTable}
                  onValueChange={(value) => handleJoinChange(index, "toTable", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="To Table" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((ds) => (
                      <SelectItem key={ds} value={ds}>
                        {ds}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={join.toColumn}
                  onValueChange={(value) => handleJoinChange(index, "toColumn", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="To Column" />
                  </SelectTrigger>
                  <SelectContent>
                    {(allColumns[join.toTable] || []).map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button onClick={handleAddJoin} variant="outline" size="sm" className="mt-2">
             <Plus className="h-4 w-4 mr-2" />
              Add Join
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calculationType">Calculation Type</Label>
              <Select value={calculationType} onValueChange={setCalculationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select calculation type" />
                </SelectTrigger>
                <SelectContent>
                  {calculationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calculationColumn">Calculation Column</Label>
              <Select value={calculationColumn} onValueChange={setCalculationColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Filters</Label>
            {filters.map((filter, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 mt-2">
                <Select
                  value={filter.column}
                  onValueChange={(value) => handleFilterChange(index, "column", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filter.operator}
                  onValueChange={(value) => handleFilterChange(index, "operator", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={filter.value}
                  onChange={(e) => handleFilterChange(index, "value", e.target.value)}
                  placeholder="Value"
                />
              </div>
            ))}
            <Button onClick={handleAddFilter} variant="outline" size="sm" className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveLogic}>Save Logic</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CustomReportCreator;
