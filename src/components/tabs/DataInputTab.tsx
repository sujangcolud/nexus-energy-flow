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
  UploadCloud,
  Sparkles,
  Zap,
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

      // Trim data, split into rows, and slice(1) to remove the header row.
      const rows = bulkData.trim().split("\n").slice(1);

      if (rows.length === 0) {
        toast.error(
          "No data rows found. Please make sure to paste data including the header row.",
        );
        return;
      }

      const parsedData = rows.map((row, index) => {
        // We log index + 2 because index 0 is the first data row (row 2 in the sheet)
        console.log(`Row ${index + 2} raw data: "${row}"`);
        const columns = row.split("\t");
        console.log(`Row ${index + 1} split into columns:`, columns);

        if (columns.length !== fields.length) {
          throw new Error(
            `Row ${index + 1} has ${columns.length} columns, but ${fields.length} were expected.`,
          );
        }

        const rowData: any = {};
        fields.forEach((field, i) => {
          rowData[field.name] = columns[i].trim();
        });

        console.log(`Row ${index + 1} parsed into object:`, rowData);
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
            // If the field is a number, parse it. If it's an empty string, set it to null.
            const numValue = transformed[field.name];
            transformed[field.name] = numValue
              ? parseFloat(numValue) || 0
              : null;
          }
          if (field.type === "date") {
            const dateString = transformed[field.name];
            if (dateString) {
              // Use date-fns's parse function for reliable parsing.
              // It requires a format string. We'll assume 'yyyy-MM-dd'.
              const parsedDate = parse(dateString, "yyyy-MM-dd", new Date());
              if (!isNaN(parsedDate.getTime())) {
                transformed[field.name] = format(parsedDate, "yyyy-MM-dd");
              } else {
                throw new Error(
                  `Invalid date format for '${field.name}' (value: "${dateString}"). Please use YYYY-MM-DD.`,
                );
              }
            } else {
              // If no date is provided, default to today.
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-sky-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-indigo-400/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xl animate-pulse">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Bulk Data Import
            </h1>
            <Sparkles className="h-8 w-8 text-blue-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Import large datasets efficiently with our powerful bulk upload
            system
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-sky-50 to-blue-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-sky-600 font-medium">Data Types</p>
                  <p className="text-2xl font-bold text-sky-800">
                    {dataTypes.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl text-white">
                  <Database className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Selected Type
                  </p>
                  <p className="text-lg font-bold text-blue-800">
                    {dataType
                      ? dataTypes.find((t) => t.value === dataType)?.label
                      : "None"}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white">
                  <FileUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 font-medium">
                    Data Rows
                  </p>
                  <p className="text-2xl font-bold text-indigo-800">
                    {bulkData ? bulkData.split("\n").length - 1 : 0}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Status</p>
                  <p className="text-lg font-bold text-purple-800">
                    {saving ? "Uploading" : "Ready"}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                  <Zap className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Input Area */}
        <Card className="bg-gradient-to-br from-white/90 to-sky-50/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <UploadCloud className="h-6 w-6" />
              </div>
              Copy and Paste Data
              <Sparkles className="h-5 w-5 animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Database className="h-4 w-4 text-sky-600" />
                  Data Type *
                </label>
                <Select
                  value={dataType}
                  onValueChange={(value: DataType) => setDataType(value)}
                >
                  <SelectTrigger className="border-sky-200 focus:border-sky-500 focus:ring-sky-500 h-12">
                    <SelectValue placeholder="Select data type to upload" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-500"></div>
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileUp className="h-4 w-4 text-blue-600" />
                Paste Data from Spreadsheet
              </label>
              <div className="relative">
                <Textarea
                  placeholder="Copy data from Google Sheets, Excel, or a TSV file and paste it here. Each row should be on a new line, and each column separated by a tab."
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  rows={15}
                  disabled={!dataType}
                  className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                />
                {!dataType && (
                  <div className="absolute inset-0 bg-gray-100/50 backdrop-blur-sm rounded-md flex items-center justify-center">
                    <p className="text-gray-500 font-medium">
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
                className="h-12 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 hover:from-sky-600 hover:via-blue-600 hover:to-indigo-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UploadCloud className="h-5 w-5" />
                    Parse and Upload Data
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Field Guidelines */}
        {dataType && (
          <Card className="bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border-0 shadow-2xl animate-in fade-in slide-in-from-bottom duration-500">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingUp className="h-6 w-6" />
                </div>
                Column Order for "
                {dataTypes.find((t) => t.value === dataType)?.label}"
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-blue-800 mb-4 font-medium">
                When you copy from your spreadsheet, ensure the columns are in
                the following order. Required fields are marked with{" "}
                <span className="text-red-500 font-bold">*</span>.
              </p>
              <div className="text-sm font-mono bg-gradient-to-r from-white to-blue-50 p-4 rounded-lg border border-blue-200 shadow-inner">
                {tableFields[dataType].map((field, index) => (
                  <span key={field.name} className="inline-block">
                    <span
                      className={`px-2 py-1 rounded ${field.required ? "bg-red-100 text-red-800 border border-red-200" : "bg-blue-100 text-blue-800 border border-blue-200"}`}
                    >
                      {field.name}
                      {field.required && (
                        <span className="text-red-500 font-bold">*</span>
                      )}
                    </span>
                    {index < tableFields[dataType].length - 1 && (
                      <span className="text-gray-400 mx-2 font-bold"> → </span>
                    )}
                  </span>
                ))}
              </div>
              <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Pro Tip: Copy the header row from your spreadsheet first, then
                  copy the data rows to ensure proper column alignment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DataInputTab;
