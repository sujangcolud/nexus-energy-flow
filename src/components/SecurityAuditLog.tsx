
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export const SecurityAuditLog: React.FC = () => {
  const { user, hasRole } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["security-logs"],
    queryFn: async () => {
      if (!user || !hasRole("super_admin")) {
        return [];
      }

      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching security logs:", error);
        return [];
      }

      return data;
    },
    enabled: !!user && hasRole("super_admin"),
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("FAILED") || action.includes("DENIED")) {
      return "destructive";
    }
    if (action.includes("GRANTED") || action.includes("SUCCESS")) {
      return "default";
    }
    if (action.includes("CHANGED") || action.includes("MODIFIED")) {
      return "secondary";
    }
    return "outline";
  };

  if (!user || !hasRole("super_admin")) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Access denied. Super admin role required.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Audit Log</CardTitle>
        <CardDescription>
          System security events and access attempts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading security logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground">No security events found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.table_name}</TableCell>
                  <TableCell>{log.user_id}</TableCell>
                  <TableCell>
                    {log.details && typeof log.details === 'object' ? (
                      <code className="text-xs bg-muted p-1 rounded">
                        {JSON.stringify(log.details, null, 2).slice(0, 100)}
                        {JSON.stringify(log.details).length > 100 && "..."}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
