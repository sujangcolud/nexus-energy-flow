import { useState } from "react";
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

const CustomReportCreator = () => {
  const { user } = useAuth();
  const [reportName, setReportName] = useState("");
  const [dataSource, setDataSource] = useState("");
  const [calculationType, setCalculationType] = useState("");
  const [filters, setFilters] = useState([{ column: "", operator: "", value: "" }]);

  const dataSources = ["orders", "charging_sessions", "expenses", "deposits", "withdrawals", "cooperative_savings"];
  const calculationTypes = ["sum", "average", "count"];
  const operators = ["=", "!=", ">", "<", ">=", "<="];

  const handleAddFilter = () => {
    setFilters([...filters, { column: "", operator: "", value: "" }]);
  };

  const handleFilterChange = (index: number, field: string, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const handleSaveLogic = async () => {
    if (!reportName || !dataSource || !calculationType) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const { error } = await supabase.from("custom_reports").insert({
        user_id: user!.id,
        name: reportName,
        data_source: dataSource,
        calculation_type: calculationType,
        filters: filters,
      });

      if (error) throw error;

      toast.success("Custom report logic saved successfully!");
      setReportName("");
      setDataSource("");
      setCalculationType("");
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataSource">Data Source</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <div>
            <Label>Filters</Label>
            {filters.map((filter, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 mt-2">
                <Input
                  value={filter.column}
                  onChange={(e) => handleFilterChange(index, "column", e.target.value)}
                  placeholder="Column"
                />
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
