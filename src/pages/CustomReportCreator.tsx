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
  const [calculationString, setCalculationString] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [allColumns, setAllColumns] = useState<Record<string, string[]>>({});

  const calculationHeadings = [
    "Revenue vs. Expenses (Last 12 Months)",
    "Profitability Trend (Last 12 Months)",
    "Income Breakdown",
    "Expense Categorization",
    "Deposits vs. Withdrawals (Last 12 Months)",
    "New User Growth",
    "User Role Distribution",
    "Top 5 Spenders",
    "Popular Products/Services",
    "Sales by Payment Mode",
    "Cooperative Savings Trend",
    "Menu Item Availability",
    "Financial Analytics",
    "Key Metrics",
    "Charging & Restaurant Income Correlation",
    "Balance Distribution",
    "Daily Income Trend",
    "Income Sources",
    "Summary Statistics",
    "Business Analytics",
    "Financial Summary",
    "Top Performing Items",
    "Expense Category Analysis",
    "Payment Method Insights",
    "Performance Metrics",
    "Reports Generator",
    "Order Report",
    "Expense Report",
    "Charging Report",
    "Deposit Report",
    "Withdrawal Report",
    "Cooperative Savings Report",
    "Complete Business Report",
    "Reports Viewer",
    "Transaction Summary",
    "Financial Breakdown",
    "Daily Performance Analysis",
    "Payment Method Analysis",
    "Expense Categories",
  ];

  useEffect(() => {
    const fetchAllColumns = async () => {
      const { data, error } = await supabase.rpc('get_all_table_columns');
      if (error) {
        console.error("Error fetching all columns:", error);
      } else {
        const formattedColumns: string[] = [];
        for (const table in data) {
          data[table].forEach((column: string) => {
            formattedColumns.push(`${table}.${column}`);
          });
        }
        setColumns(formattedColumns);
      }
    };
    fetchAllColumns();
  }, []);

  const handleAddColumn = (column: string) => {
    setCalculationString(prev => prev ? `${prev} + ${column}` : column);
  };

  const handleAddOperator = (operator: string) => {
    setCalculationString(prev => `${prev} ${operator} `);
  };

  const handleSaveLogic = async () => {
    // Save logic to be implemented
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
            <Label>Calculation Headings</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {calculationHeadings.map(heading => (
                <Button key={heading} variant="outline" size="sm">{heading}</Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Calculation</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={calculationString}
                readOnly
                placeholder="Column1 + Column2"
              />
              <Button variant="outline" size="icon" onClick={() => setCalculationString("")}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Columns</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {columns.map(column => (
                <Button key={column} variant="outline" size="sm" onClick={() => handleAddColumn(column)}>{column}</Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Operators</Label>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => handleAddOperator('+')}>+</Button>
              <Button variant="outline" size="sm" onClick={() => handleAddOperator('-')}>-</Button>
              <Button variant="outline" size="sm" onClick={() => handleAddOperator('*')}>*</Button>
              <Button variant="outline" size="sm" onClick={() => handleAddOperator('/')}>/</Button>
            </div>
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
