import { useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Database,
  Download,
  Cloud,
  FileText,
  AlertCircle,
  CheckCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";

type DataType =
  | "orders"
  | "charging_sessions"
  | "expenses"
  | "deposits"
  | "withdrawals"
  | "cooperative_savings"
  | "share_investments"
  | "inventory"
  | "menu_items";

interface FieldDef {
  name: string;
  type: "text" | "number" | "date" | "boolean";
  required: boolean;
  example: string;
}

const SCHEMAS: Record<DataType, { label: string; fields: FieldDef[] }> = {
  orders: {
    label: "Orders",
    fields: [
      { name: "item_name", type: "text", required: true, example: "Tea" },
      { name: "quantity", type: "number", required: true, example: "2" },
      { name: "rate", type: "number", required: true, example: "50" },
      { name: "total", type: "number", required: true, example: "100" },
      { name: "payment_mode", type: "text", required: true, example: "Cash" },
      { name: "order_date", type: "date", required: false, example: "2025-01-15" },
    ],
  },
  charging_sessions: {
    label: "Charging Sessions",
    fields: [
      { name: "total_amount", type: "number", required: true, example: "500" },
      { name: "payment_mode", type: "text", required: true, example: "Cash" },
      { name: "category", type: "text", required: false, example: "EV" },
      { name: "start_percentage", type: "number", required: false, example: "20" },
      { name: "end_percentage", type: "number", required: false, example: "80" },
      { name: "kcal", type: "number", required: false, example: "10" },
      { name: "per_unit_rate", type: "number", required: false, example: "25" },
      { name: "per_percent_rate", type: "number", required: false, example: "8" },
      { name: "session_date", type: "date", required: false, example: "2025-01-15" },
    ],
  },
  expenses: {
    label: "Expenses",
    fields: [
      { name: "description", type: "text", required: true, example: "Electricity bill" },
      { name: "amount", type: "number", required: true, example: "1500" },
      { name: "category", type: "text", required: true, example: "Electricity" },
      { name: "payment_mode", type: "text", required: true, example: "Cash" },
      { name: "remarks", type: "text", required: false, example: "Monthly" },
      { name: "expense_date", type: "date", required: false, example: "2025-01-15" },
    ],
  },
  deposits: {
    label: "Deposits",
    fields: [
      { name: "amount", type: "number", required: true, example: "1000" },
      { name: "deposited_by", type: "text", required: true, example: "John" },
      { name: "mode", type: "text", required: true, example: "Cash" },
      { name: "deposited_to", type: "text", required: false, example: "Bank" },
      { name: "remarks", type: "text", required: false, example: "Advance" },
      { name: "deposit_date", type: "date", required: false, example: "2025-01-15" },
    ],
  },
  withdrawals: {
    label: "Withdrawals",
    fields: [
      { name: "amount", type: "number", required: true, example: "500" },
      { name: "purpose", type: "text", required: true, example: "Office supplies" },
      { name: "recipient", type: "text", required: false, example: "Vendor" },
      { name: "payment_mode", type: "text", required: false, example: "Cash" },
      { name: "withdrawal_from", type: "text", required: false, example: "Cooperative" },
      { name: "category", type: "text", required: false, example: "general" },
      { name: "reference_number", type: "text", required: false, example: "REF001" },
      { name: "remarks", type: "text", required: false, example: "Note" },
      { name: "withdrawal_date", type: "date", required: false, example: "2025-01-15" },
    ],
  },
  cooperative_savings: {
    label: "Cooperative Savings",
    fields: [
      { name: "member_id", type: "text", required: true, example: "M001" },
      { name: "contribution_amount", type: "number", required: true, example: "1000" },
      { name: "cycle_period", type: "text", required: false, example: "Monthly" },
      { name: "payment_mode", type: "text", required: false, example: "Cash" },
      { name: "savings_to", type: "text", required: false, example: "Cooperative" },
      { name: "contribution_date", type: "date", required: false, example: "2025-01-15" },
    ],
  },
  share_investments: {
    label: "Share Investments",
    fields: [
      { name: "shareholder_name", type: "text", required: true, example: "John Doe" },
      { name: "contribution_amount", type: "number", required: true, example: "10000" },
      { name: "payment_mode", type: "text", required: true, example: "Cash" },
      { name: "investment_date", type: "date", required: false, example: "2025-01-15" },
    ],
  },
  inventory: {
    label: "Inventory",
    fields: [
      { name: "item_name", type: "text", required: true, example: "Sugar" },
      { name: "quantity", type: "number", required: true, example: "10" },
      { name: "unit_cost", type: "number", required: false, example: "100" },
      { name: "total_cost", type: "number", required: false, example: "1000" },
      { name: "category", type: "text", required: false, example: "Groceries" },
      { name: "description", type: "text", required: false, example: "1kg pack" },
      { name: "supplier", type: "text", required: false, example: "Local store" },
      { name: "location", type: "text", required: false, example: "Storage A" },
      { name: "minimum_stock", type: "number", required: false, example: "5" },
      { name: "purchase_date", type: "date", required: false, example: "2025-01-15" },
      { name: "expiry_date", type: "date", required: false, example: "2026-01-15" },
    ],
  },
  menu_items: {
    label: "Menu Items",
    fields: [
      { name: "name", type: "text", required: true, example: "Coffee" },
      { name: "price", type: "number", required: true, example: "80" },
      { name: "category", type: "text", required: true, example: "Beverages" },
      { name: "description", type: "text", required: false, example: "Hot coffee" },
      { name: "is_available", type: "boolean", required: false, example: "true" },
    ],
  },
};

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const buildTemplateCSV = (type: DataType): string => {
  const fields = SCHEMAS[type].fields;
  const header = fields.map((f) => f.name).join(",");
  const example = fields.map((f) => f.example).join(",");
  return `${header}\n${example}\n`;
};

const downloadTemplateXLSX = (type: DataType) => {
  const fields = SCHEMAS[type].fields;
  const header = fields.map((f) => f.name);
  const example = fields.map((f) => f.example);
  const ws = XLSX.utils.aoa_to_sheet([header, example]);
  ws["!cols"] = header.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SCHEMAS[type].label.slice(0, 31));
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(`${type}_template.xlsx`, new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
};

const parseXLSX = async (file: File): Promise<any[]> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets");
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "", raw: false });
  return rows;
};

const parseCSV = (text: string): any[] => {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have header and at least one row");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: any = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
};

const parseTSV = (text: string, fields: FieldDef[]): any[] => {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  // Detect if first line is header
  const firstCols = lines[0].split("\t").map((c) => c.trim().toLowerCase());
  const fieldNames = fields.map((f) => f.name.toLowerCase());
  const hasHeader = firstCols.some((c) => fieldNames.includes(c));
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const headers = hasHeader ? lines[0].split("\t").map((c) => c.trim()) : fields.map((f) => f.name);
  return dataLines.filter((l) => l.trim()).map((line) => {
    const values = line.split("\t").map((v) => v.trim());
    const row: any = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
};

const transformRow = (row: any, type: DataType, userId: string): any => {
  const fields = SCHEMAS[type].fields;
  const out: any = {};
  fields.forEach((f) => {
    let val = row[f.name];
    if (val === undefined || val === null || val === "") {
      if (f.type === "date") {
        out[f.name] = new Date().toISOString().split("T")[0];
      }
      return;
    }
    if (f.type === "number") {
      out[f.name] = parseFloat(val) || 0;
    } else if (f.type === "boolean") {
      out[f.name] = String(val).toLowerCase() !== "false";
    } else {
      out[f.name] = String(val);
    }
  });
  // Ensure required defaults for orders quantity
  if (type === "orders" && !out.quantity) out.quantity = 1;
  // user_id (menu_items has no user_id)
  if (type !== "menu_items") out.user_id = userId;
  return out;
};

const validateRow = (row: any, type: DataType): string | null => {
  const required = SCHEMAS[type].fields.filter((f) => f.required);
  for (const f of required) {
    const v = row[f.name];
    if (v === undefined || v === null || String(v).trim() === "") {
      return `Missing required field: ${f.name}`;
    }
  }
  return null;
};

const UnifiedBulkImportTab = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("data-import");
  const [dataType, setDataType] = useState<DataType | "">("");

  // Paste state
  const [pasteData, setPasteData] = useState("");
  const [pasteSaving, setPasteSaving] = useState(false);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");

  const handleDownloadTemplate = (format: "csv" | "xlsx" = "xlsx") => {
    if (!dataType) {
      toast.error("Please select a data type first");
      return;
    }
    if (format === "csv") {
      const csv = buildTemplateCSV(dataType);
      downloadBlob(`${dataType}_template.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    } else {
      downloadTemplateXLSX(dataType);
    }
    toast.success(`${SCHEMAS[dataType].label} template downloaded (${format.toUpperCase()})`);
  };

  const insertRows = async (type: DataType, rows: any[]) => {
    const batchSize = 50;
    const total = Math.ceil(rows.length / batchSize);
    for (let i = 0; i < total; i++) {
      const batch = rows.slice(i * batchSize, (i + 1) * batchSize);
      const { error } = await (supabase.from(type as any) as any).insert(batch);
      if (error) throw error;
      setProgress(((i + 1) / total) * 100);
    }
  };

  const handlePasteUpload = async () => {
    if (!user || !dataType || !pasteData.trim()) {
      toast.error("Select data type and paste data");
      return;
    }
    setPasteSaving(true);
    try {
      const fields = SCHEMAS[dataType].fields;
      const parsed = parseTSV(pasteData, fields);
      if (parsed.length === 0) throw new Error("No rows found");

      const transformed: any[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const t = transformRow(parsed[i], dataType, user.id);
        const err = validateRow(t, dataType);
        if (err) throw new Error(`Row ${i + 1}: ${err}`);
        transformed.push(t);
      }

      await insertRows(dataType, transformed);
      toast.success(`Uploaded ${transformed.length} ${SCHEMAS[dataType].label} records`);
      setPasteData("");
    } catch (e: any) {
      toast.error(e.message || "Failed to upload");
    } finally {
      setPasteSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.toLowerCase().split(".").pop();
    if (!["csv", "json", "xlsx", "xls"].includes(ext || "")) {
      toast.error("Please select a CSV, JSON, or Excel (.xlsx/.xls) file");
      e.target.value = "";
      return;
    }
    setFile(f);
    setUploadStatus("idle");
  };

  const handleFileUpload = async () => {
    if (!user || !dataType || !file) {
      toast.error("Select data type and file");
      return;
    }
    setUploading(true);
    setProgress(0);
    setUploadStatus("idle");
    try {
      const lower = file.name.toLowerCase();
      let raw: any[];
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        raw = await parseXLSX(file);
      } else if (lower.endsWith(".json")) {
        const text = await file.text();
        raw = JSON.parse(text);
        if (!Array.isArray(raw)) throw new Error("JSON must be an array");
      } else {
        const text = await file.text();
        raw = parseCSV(text);
      }
      if (raw.length === 0) throw new Error("No rows found");

      const transformed: any[] = [];
      for (let i = 0; i < raw.length; i++) {
        const t = transformRow(raw[i], dataType, user.id);
        const err = validateRow(t, dataType);
        if (err) throw new Error(`Row ${i + 1}: ${err}`);
        transformed.push(t);
      }

      await insertRows(dataType, transformed);
      toast.success(`Uploaded ${transformed.length} ${SCHEMAS[dataType].label} records`);
      setUploadStatus("success");
      setFile(null);
      setProgress(0);
    } catch (e: any) {
      setUploadStatus("error");
      toast.error(e.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const currentSchema = dataType ? SCHEMAS[dataType] : null;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Bulk Import</h1>
        </div>

        {/* Shared data-type selector + template download */}
        <Card className="bg-card border">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-medium text-foreground">Data Type</label>
                <Select value={dataType} onValueChange={(v: DataType) => setDataType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select what to import" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHEMAS).map(([key, v]) => (
                      <SelectItem key={key} value={key}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => handleDownloadTemplate("xlsx")} disabled={!dataType}>
                <Download className="h-4 w-4 mr-2" />Excel Template
              </Button>
              <Button variant="outline" onClick={() => handleDownloadTemplate("csv")} disabled={!dataType}>
                <Download className="h-4 w-4 mr-2" />CSV Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="data-import" className="flex items-center gap-2">
              <Database className="h-4 w-4" />Paste Data
            </TabsTrigger>
            <TabsTrigger value="file-upload" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />File Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data-import">
            <Card className="bg-card border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Paste from Spreadsheet (TSV)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Copy rows from Google Sheets / Excel. First row should be headers matching the template.
                </p>
                <Textarea
                  placeholder={dataType ? `Paste ${SCHEMAS[dataType].label} data here (tab-separated)` : "Select a data type first"}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  rows={10}
                  disabled={!dataType}
                />
                <div className="flex justify-end">
                  <Button onClick={handlePasteUpload} disabled={pasteSaving || !dataType || !pasteData.trim()}>
                    <Save className="h-4 w-4 mr-2" />
                    {pasteSaving ? "Uploading..." : "Upload Data"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="file-upload">
            <Card className="bg-card border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Upload Excel, CSV or JSON File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="file"
                  accept=".csv,.json,.xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={uploading || !dataType}
                />
                {file && (
                  <div className="p-3 bg-muted rounded-md border flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Uploading...</span>
                      <span className="text-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
                {uploadStatus === "success" && (
                  <div className="flex items-center gap-2 text-primary bg-primary/10 p-3 rounded-md">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Upload completed!</span>
                  </div>
                )}
                {uploadStatus === "error" && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Upload failed. Check format.</span>
                  </div>
                )}
                <Button onClick={handleFileUpload} disabled={!file || !dataType || uploading} className="w-full">
                  {uploading ? "Uploading..." : "Upload File"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {currentSchema && (
          <Card className="bg-card border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Expected Format — {currentSchema.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Field</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Required</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSchema.fields.map((f) => (
                      <tr key={f.name} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium text-foreground">{f.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{f.type}</td>
                        <td className="py-2 px-3">
                          {f.required ? <span className="text-destructive">Yes</span> : <span className="text-muted-foreground">No</span>}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{f.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UnifiedBulkImportTab;
