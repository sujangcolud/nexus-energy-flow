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

interface CustomCalculation {
  heading: string;
  formula: {
    table: string;
    column: string;
    operator: string;
  }[];
}

interface Filter {
  column: string;
  operator: string;
  value: string;
}

const CustomReportCreator = () => {
  const { user } = useAuth();
  const [reportName, setReportName] = useState("");
  const [customCalculations, setCustomCalculations] = useState<CustomCalculation[]>([]);
  const [allColumns, setAllColumns] = useState<Record<string, string[]>>({});
  const [currentFormula, setCurrentFormula] = useState<{table: string, column: string, operator: string}[]>([]);
  const [currentHeading, setCurrentHeading] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);

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

  const handleAddFormulaPart = () => {
    setCurrentFormula([...currentFormula, { table: "", column: "", operator: "" }]);
  };

  const handleFormulaPartChange = (index: number, field: string, value: string) => {
    const newFormula = [...currentFormula];
    newFormula[index] = { ...newFormula[index], [field]: value };
    setCurrentFormula(newFormula);
  };

  const handleSaveCalculation = () => {
    if (!currentHeading || currentFormula.length === 0) {
      toast.error("Please fill in all fields for the custom calculation.");
      return;
    }
    setCustomCalculations([...customCalculations, { heading: currentHeading, formula: currentFormula }]);
    setCurrentHeading("");
    setCurrentFormula([]);
  };

  const handleAddFilter = () => {
    setFilters([...filters, { column: "", operator: "", value: "" }]);
  };

  const handleFilterChange = (index: number, field: string, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const handleGenerateReport = async () => {
    // This is a placeholder for the actual report generation logic
    const mockData = customCalculations.map(calc => ({
      heading: calc.heading,
      value: Math.random() * 1000,
    }));
    setReportData(mockData);
  };

  return (
    <div className="grid grid-cols-2 gap-4 container mx-auto p-4">
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Report</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.map((data, index) => (
              <div key={index} className="p-2 border rounded-md mt-2">
                <p className="font-bold">{data.heading}</p>
                <p>{data.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div>
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
                placeholder="e.g., 'My Awesome Report'"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Custom Calculations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="heading">Heading</Label>
                  <Input
                    id="heading"
                    value={currentHeading}
                    onChange={(e) => setCurrentHeading(e.target.value)}
                    placeholder="e.g., 'Total Revenue'"
                  />
                </div>

                {currentFormula.map((part, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 items-center">
                    <Select
                      value={part.table}
                      onValueChange={(value) => handleFormulaPartChange(index, "table", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select table" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(allColumns).map((table) => (
                          <SelectItem key={table} value={table}>
                            {table}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={part.column}
                      onValueChange={(value) => handleFormulaPartChange(index, "column", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {(allColumns[part.table] || []).map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={part.operator}
                      onValueChange={(value) => handleFormulaPartChange(index, "operator", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+">+</SelectItem>
                        <SelectItem value="-">-</SelectItem>
                        <SelectItem value="*">*</SelectItem>
                        <SelectItem value="/">/</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setCurrentFormula(currentFormula.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={handleAddFormulaPart} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Part
                </Button>
                <Button onClick={handleSaveCalculation}>Save Calculation</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {filters.map((filter, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 items-center">
                    <Select
                      value={filter.column}
                      onValueChange={(value) => handleFilterChange(index, "column", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(allColumns).map((table) =>
                          allColumns[table].map((col) => (
                            <SelectItem key={`${table}.${col}`} value={`${table}.${col}`}>
                              {`${table}.${col}`}
                            </SelectItem>
                          ))
                        )}
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
                        <SelectItem value="=">=</SelectItem>
                        <SelectItem value="!=">!=</SelectItem>
                        <SelectItem value=">">&gt;</SelectItem>
                        <SelectItem value="<">&lt;</SelectItem>
                        <SelectItem value=">=">&gt;=</SelectItem>
                        <SelectItem value="<=">&lt;=</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={filter.value}
                      onChange={(e) => handleFilterChange(index, "value", e.target.value)}
                      placeholder="Value"
                    />
                    <Button variant="outline" size="icon" onClick={() => setFilters(filters.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={handleAddFilter} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Filter
                </Button>
              </CardContent>
            </Card>

            <div>
              <Label>Saved Calculations</Label>
              {customCalculations.map((calc, index) => (
                <div key={index} className="p-2 border rounded-md mt-2">
                  <p className="font-bold">{calc.heading}</p>
                  <p>{calc.formula.map(p => `${p.table}.${p.column} ${p.operator}`).join(' ')}</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleGenerateReport}>Generate Report</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default CustomReportCreator;
