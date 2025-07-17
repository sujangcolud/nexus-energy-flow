import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Download,
  Trash2,
  FileUp,
  FileDown,
  AlertTriangle,
  Database,
} from "lucide-react";

type DataType =
  | "orders"
  | "chargings"
  | "savings"
  | "withdrawals"
  | "investments"
  | "expenses"
  | "deposits";

const dataTypes: {
  id: DataType;
  label: string;
  table: string;
  icon: JSX.Element;
}[] = [
  {
    id: "orders",
    label: "Orders",
    table: "orders",
    icon: <FileUp className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "chargings",
    label: "Chargings",
    table: "chargings",
    icon: <FileUp className="h-5 w-5 text-green-500" />,
  },
  {
    id: "savings",
    label: "Savings",
    table: "cooperative_savings",
    icon: <FileUp className="h-5 w-5 text-indigo-500" />,
  },
  {
    id: "withdrawals",
    label: "Withdrawals",
    table: "withdrawals",
    icon: <FileUp className="h-5 w-5 text-purple-500" />,
  },
  {
    id: "investments",
    label: "Investments",
    table: "share_investments",
    icon: <FileUp className="h-5 w-5 text-yellow-500" />,
  },
  {
    id: "expenses",
    label: "Expenses",
    table: "expenses",
    icon: <FileUp className="h-5 w-5 text-red-500" />,
  },
  {
    id: "deposits",
    label: "Deposits",
    table: "deposits",
    icon: <FileUp className="h-5 w-5 text-pink-500" />,
  },
];

const DataManagement = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"export" | "delete" | null>(
    null,
  );
  const [selectedType, setSelectedType] = useState<DataType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = (
    action: "export" | "delete",
    type: (typeof dataTypes)[0],
  ) => {
    setActionType(action);
    setSelectedType(type.id);
    setDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedType || !actionType) return;

    const typeInfo = dataTypes.find((t) => t.id === selectedType);
    if (!typeInfo) return;

    setIsLoading(true);

    if (actionType === "export") {
      try {
        const { data, error } = await supabase.from(typeInfo.table).select("*");
        if (error) throw error;

        if (data.length === 0) {
          toast.info(`No data to export for ${typeInfo.label}.`);
          return;
        }

        const headers = Object.keys(data[0]);
        const csv = [
          headers.join(","),
          ...data.map((row) =>
            headers.map((header) => JSON.stringify(row[header])).join(","),
          ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${typeInfo.table}_export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${typeInfo.label} data successfully.`);
      } catch (error) {
        console.error("Export error:", error);
        toast.error(`Failed to export ${typeInfo.label} data.`);
      } finally {
        setIsLoading(false);
        setDialogOpen(false);
      }
    } else if (actionType === "delete") {
      try {
        const { error } = await supabase.from(typeInfo.table).delete();
        // .neq("id", "0"); // Dummy condition to delete all rows

        if (error) throw error;
        toast.success(`Deleted all ${typeInfo.label} data successfully.`);
      } catch (error) {
        console.error("Delete error:", error);
        toast.error(`Failed to delete ${typeInfo.label} data.`);
      } finally {
        setIsLoading(false);
        setDialogOpen(false);
      }
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataTypes.map((type) => (
              <div
                key={type.id}
                className="p-4 rounded-lg border bg-white flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {type.icon}
                  <span className="font-medium">{type.label}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction("export", type)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction("delete", type)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              Confirm Action
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType}{" "}
              {selectedType &&
                `all ${dataTypes.find((t) => t.id === selectedType)?.label} data`}
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "delete" ? "destructive" : "default"}
              onClick={confirmAction}
              disabled={isLoading}
            >
              {isLoading
                ? "Processing..."
                : `Yes, ${actionType === "delete" ? "Delete" : "Export"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DataManagement;
