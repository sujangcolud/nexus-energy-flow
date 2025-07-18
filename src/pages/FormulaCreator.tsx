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

const FormulaCreator = () => {
  const { user } = useAuth();
  const [formulas, setFormulas] = useState<Record<string, { formula: { column: string; operator: string }[] }>>({});
  const [columns, setColumns] = useState<string[]>([]);
  const [allColumns, setAllColumns] = useState<Record<string, string[]>>({});

  const headings = [
    "cashInHand",
    "esewaBalance",
    "fonepayBalance",
    "bankBalance",
    "cooperativeSavings",
    "totalRevenue",
    "totalExpenses",
    "netProfit",
  ];

  const operators = ["+", "-", "*", "/"];

  useEffect(() => {
    const fetchAllColumns = async () => {
      const { data, error } = await supabase.rpc('get_all_table_columns');
      if (error) {
        console.error("Error fetching all columns:", error);
      } else {
        setAllColumns(data);
        const allCols: string[] = [];
        for (const table in data) {
          allCols.push(...data[table].map((col: string) => `${table}.${col}`));
        }
        setColumns(allCols);
      }
    };
    fetchAllColumns();
  }, []);

  useEffect(() => {
    const fetchFormulas = async () => {
      const { data, error } = await supabase.from("formulas").select("*").eq("user_id", user!.id);
      if (error) {
        console.error("Error fetching formulas:", error);
      } else {
        const newFormulas: Record<string, { formula: { column: string; operator: string }[] }> = {};
        data.forEach((f: any) => {
          newFormulas[f.heading] = { formula: f.formula };
        });
        setFormulas(newFormulas);
      }
    };
    if (user) {
      fetchFormulas();
    }
  }, [user]);

  const handleFormulaChange = (heading: string, index: number, field: string, value: string) => {
    const newFormulas = { ...formulas };
    if (!newFormulas[heading]) {
      newFormulas[heading] = { formula: [] };
    }
    const newFormula = [...newFormulas[heading].formula];
    newFormula[index] = { ...newFormula[index], [field]: value };
    newFormulas[heading].formula = newFormula;
    setFormulas(newFormulas);
  };

  const handleAddColumn = (heading: string) => {
    const newFormulas = { ...formulas };
    if (!newFormulas[heading]) {
      newFormulas[heading] = { formula: [] };
    }
    newFormulas[heading].formula.push({ column: "", operator: "+" });
    setFormulas(newFormulas);
  };

  const handleSaveFormula = async (heading: string) => {
    const formula = formulas[heading].formula;
    if (formula.some((f) => !f.column)) {
      toast.error("Please select a column for each part of the formula.");
      return;
    }

    try {
      const { error } = await supabase.from("formulas").upsert({
        user_id: user!.id,
        heading: heading,
        formula: formula,
      });

      if (error) throw error;

      toast.success(`Formula for ${heading} saved successfully!`);
    } catch (error) {
      console.error(`Error saving formula for ${heading}:`, error);
      toast.error(`Failed to save formula for ${heading}.`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Define Formulas</CardTitle>
          <CardDescription>
            Define the formulas for the calculation headings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {headings.map((heading) => (
            <div key={heading} className="space-y-2">
              <Label>{heading}</Label>
              {(formulas[heading]?.formula || []).map((f, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={f.column}
                    onValueChange={(value) => handleFormulaChange(heading, index, "column", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={f.operator}
                    onValueChange={(value) => handleFormulaChange(heading, index, "operator", value)}
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
                </div>
              ))}
              <Button onClick={() => handleAddColumn(heading)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
              <Button onClick={() => handleSaveFormula(heading)} size="sm" className="ml-2">
                Save
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default FormulaCreator;
