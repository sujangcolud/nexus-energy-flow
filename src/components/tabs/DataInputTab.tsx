import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Save,
  Database,
  Upload,
  FileUp,
  TrendingUp,
} from "lucide-react";
import { format, parse } from "date-fns";

type DataType =
  | "orders"
  | "charging_sessions"
  | "expenses"
  | "deposits"
  | "withdrawals"
  | "cooperative_savings"
  | "menu_items";

interface TableField {
  name: string;
  type: "text" | "number" | "date" | "select";
  required: boolean;
  options?: string[];
}

const DataInputTab = () => {
  const { user } = useAuth();
  const [dataType, setDataType] = useState<DataType | "">("");
  const [bulkData, setBulkData] = useState("");
  const [saving, setSaving] = useState(false);

  const dataTypes = [
    { value: "orders" as const, label: "Orders" },
    { value: "charging_sessions" as const, label: "Charging Sessions" },
    { value: "expenses" as const, label: "Expenses" },
    { value: "deposits" as const, label: "Deposits" },
    { value: "withdrawals" as const, label: "Withdrawals" },
    { value: "cooperative_savings" as const, label: "Cooperative Savings" },
    { value: "menu_items" as const, label: "Menu Items" },
  ];

  const tableFields: { [key in DataType]: TableField[] } = {
    orders: [
      { name: "item_name", type: "text", required: true },
      { name: "quantity", type: "number", required: true },
      { name: "rate", type: "number", required: true },
      { name: "total", type: "number", required: true },
      {
        name: "payment_mode",
        type: "select",
        required: true,
        options: ["Cash", "Esewa", "Fonepay", "Bank Transfer"],
      },
      { name: "order_date", type: "date", required: false },
    ],
    charging_sessions: [
      { name: "total_amount", type: "number", required: true },
      {
        name: "payment_mode",
        type: "select",
        required: true,
        options: ["Cash", "Esewa", "Fonepay", "Bank Transfer"],
      },
      { name: "start_percentage", type: "number", required: false },
      { name: "end_percentage", type: "number", required: false },
      { name: "kcal", type: "number", required: false },
      { name: "per_unit_rate", type: "number", required: false },
      { name: "per_percent_rate", type: "number", required: false },
      { name: "session_date", type: "date", required: false },
    ],
    expenses: [
      { name: "description", type: "text", required: true },
      { name: "amount", type: "number", required: true },
      {
        name: "category",
        type: "select",
        required: true,
        options: [
          "Electricity",
          "Rent",
          "Salary",
          "EV Electricity",
          "Restaurant",
          "Fuel/Travel",
          "Savings",
          "Dues Payment",
          "Labour Payment",
          "Commission",
          "Maintenance",
          "Account Opening Charge",
          "First Aid",
          "Others",
        ],
      },
      {
        name: "payment_mode",
        type: "select",
        required: true,
        options: ["Cash", "Esewa", "Fonepay", "Bank Transfer"],
      },
      { name: "remarks", type: "text", required: false },
      { name: "expense_date", type: "date", required: false },
    ],
    deposits: [
      { name: "amount", type: "number", required: true },
      { name: "deposited_by", type: "text", required: true },
      {
        name: "mode",
        type: "select",
        required: true,
        options: ["Cash", "Esewa", "Fonepay", "Bank Transfer"],
      },
      { name: "deposit_date", type: "date", required: false },
    ],
    withdrawals: [
      { name: "amount", type: "number", required: true },
      { name: "purpose", type: "text", required: true },
      { name: "recipient", type: "text", required: false },
      { name: "reference_number", type: "text", required: false },
      { name: "remarks", type: "text", required: false },
      { name: "withdrawal_date", type: "date", required: false },
    ],
    cooperative_savings: [
      { name: "member_id", type: "text", required: true },
      { name: "contribution_amount", type: "number", required: true },
      { name: "cycle_period", type: "text", required: true },
      { name: "contribution_date", type: "date", required: false },
    ],
    menu_items: [
      { name: "name", type: "text", required: true },
      { name: "price", type: "number", required: true },
      { name: "category", type: "text", required: true },
      { name: "description", type: "text", required: false },
      {
        name: "is_available",
        type: "select",
        required: false,
        options: ["true", "false"],
      },
    ],
  };

  const saveData = async () => {
    if (!user || !dataType || !bulkData) {
      toast.error("Please select a data type and paste some data.");
      return;
    }

    setSaving(true);
    try {
      const fields = tableFields[dataType];
      const requiredFields = fields
        .filter((f) => f.required)
        .map((f) => f.name);

      const rows = bulkData.trim().split("\n").slice(1);

      if (rows.length === 0) {
        toast.error(
          "No data rows found. Please make sure to paste data including the header row.",
        );
        return;
      }

      const parsedData = rows.map((row, index) => {
        const columns = row.split("\t");

        if (columns.length !== fields.length) {
          throw new Error(
            `Row ${index + 1} has ${columns.length} columns, but ${fields.length} were expected.`,
          );
        }

        const rowData: any = {};
        fields.forEach((field, i) => {
          rowData[field.name] = columns[i].trim();
        });

        return rowData;
      });

      const validRows = parsedData.filter((row) => {
        return requiredFields.every(
          (field) => row[field] && row[field].toString().trim() !== "",
        );
      });

      if (validRows.length === 0) {
        toast.error(
          "No valid rows found. Please ensure required fields are not empty.",
        );
        return;
      }

      const transformedData = validRows.map((row) => {
        const transformed: any = { ...row };
        transformed.user_id = user.id;

        fields.forEach((field) => {
          if (field.type === "number") {
            const numValue = transformed[field.name];
            transformed[field.name] = numValue
              ? parseFloat(numValue) || 0
              : null;
          }
          if (field.type === "date") {
            const dateString = transformed[field.name];
            if (dateString) {
              const parsedDate = parse(dateString, "yyyy-MM-dd", new Date());
              if (!isNaN(parsedDate.getTime())) {
                transformed[field.name] = format(parsedDate, "yyyy-MM-dd");
              } else {
                throw new Error(
                  `Invalid date format for '${field.name}' (value: "${dateString}"). Please use YYYY-MM-DD.`,
                );
              }
            } else {
              transformed[field.name] = format(new Date(), "yyyy-MM-dd");
            }
          }
        });

        if (dataType === "menu_items") {
          delete transformed.user_id;
          if (transformed.is_available === "false") {
            transformed.is_available = false;
          } else {
            transformed.is_available = true;
          }
        }
        return transformed;
      });

      const { error } = await supabase.from(dataType).insert(transformedData);
      if (error) throw error;

      toast.success(`Successfully uploaded ${transformedData.length} records!`);
      setBulkData("");
      setDataType("");
    } catch (error: any) {
      console.error("Error saving bulk data:", error);
      toast.error(
        error.message || "Failed to save data. Check format and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 bg-background">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Bulk Data Import</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Data Types</p>
                <p className="text-xl font-bold text-foreground">{dataTypes.length}</p>
              </div>
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selected Type</p>
                <p className="text-base font-semibold text-foreground">
                  {dataType ? dataTypes.find((t) => t.value === dataType)?.label : "None"}
                </p>
              </div>
              <FileUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Data Rows</p>
                <p className="text-xl font-bold text-foreground">
                  {bulkData ? bulkData.split("\n").length - 1 : 0}
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-base font-semibold text-foreground">
                  {saving ? "Uploading" : "Ready"}
                </p>
              </div>
              <Save className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
            <Upload className="h-4 w-4" />
            Copy and Paste Data
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                Data Type *
              </label>
              <Select
                value={dataType}
                onValueChange={(value: DataType) => setDataType(value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select data type to upload" />
                </SelectTrigger>
                <SelectContent>
                  {dataTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileUp className="h-4 w-4 text-muted-foreground" />
              Paste Data from Spreadsheet
            </label>
            <div className="relative">
              <Textarea
                placeholder="Copy data from Google Sheets, Excel, or a TSV file and paste it here. Each row should be on a new line, and each column separated by a tab."
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                rows={12}
                disabled={!dataType}
                className="bg-background"
              />
              {!dataType && (
                <div className="absolute inset-0 bg-muted/50 rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground font-medium">
                    Please select a data type first
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={saveData}
              disabled={saving || !dataType || !bulkData}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  Uploading...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Upload Data
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {dataType && (
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">
              Expected Format for {dataTypes.find((t) => t.value === dataType)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Field</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Required</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {tableFields[dataType].map((field) => (
                    <tr key={field.name} className="border-b last:border-0">
                      <td className="py-2 px-3 font-medium text-foreground">{field.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{field.type}</td>
                      <td className="py-2 px-3">
                        {field.required ? (
                          <span className="text-destructive">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {field.options?.join(", ") || "-"}
                      </td>
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

export default DataInputTab;
