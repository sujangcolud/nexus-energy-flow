import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileClock, User, Code } from "lucide-react";
import { format } from "date-fns";

interface EditLog {
  id: string;
  transaction_type: string;
  transaction_id: string;
  previous_data: any;
  new_data: any;
  changed_at: string;
  user_id: string;
}

const EditLogsTab = () => {
  const [logs, setLogs] = useState<EditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("edit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching edit logs:", error);
      toast.error("Failed to load edit logs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileClock />
          Transaction Edit Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Previous Data</TableHead>
                <TableHead>New Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.changed_at), "MMM dd, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge>{log.transaction_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <pre className="text-xs bg-gray-100 p-2 rounded">
                      {JSON.stringify(log.previous_data, null, 2)}
                    </pre>
                  </TableCell>
                  <TableCell>
                    <pre className="text-xs bg-green-100 p-2 rounded">
                      {JSON.stringify(log.new_data, null, 2)}
                    </pre>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default EditLogsTab;
