import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";

interface BalanceSheetData {
  id: string;
  report_data: any;
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
}

const BalanceSheetTab = () => {
  const { user } = useAuth();
  const [balanceSheets, setBalanceSheets] = useState<BalanceSheetData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBalanceSheets();
  }, [user]);

  const fetchBalanceSheets = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("balance_sheet")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBalanceSheets(data || []);
    } catch (error) {
      console.error("Error fetching balance sheets:", error);
      toast.error("Failed to load balance sheets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Balance Sheets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Cash In Hand</TableHead>
                  <TableHead>Cash At Bank</TableHead>
                  <TableHead>Esewa Balance</TableHead>
                  <TableHead>Cooperative Savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balanceSheets.map((sheet) => (
                  <TableRow key={sheet.id}>
                    <TableCell>
                      {sheet.date_range_start && sheet.date_range_end
                        ? `${format(
                            new Date(sheet.date_range_start),
                            "PPP"
                          )} - ${format(new Date(sheet.date_range_end), "PPP")}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(sheet.created_at), "PPP p")}
                    </TableCell>
                    <TableCell>
                      {sheet.report_data.cash_in_hand}
                    </TableCell>
                    <TableCell>
                      {sheet.report_data.cash_at_bank}
                    </TableCell>
                    <TableCell>
                      {sheet.report_data.esewa_balance}
                    </TableCell>
                    <TableCell>
                      {sheet.report_data.cooperative_savings}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceSheetTab;
