import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileTableColumn {
  key: string;
  label: string;
  className?: string;
  mobileLabel?: string; // Optional different label for mobile
  hideOnMobile?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface MobileTableProps {
  columns: MobileTableColumn[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  cardKey?: string; // Unique key for mobile cards
  footer?: React.ReactNode;
}

const MobileTable: React.FC<MobileTableProps> = ({
  columns,
  data,
  loading,
  emptyMessage = "No data available",
  className,
  cardKey = "id",
  footer,
}) => {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile card layout
  if (isMobile) {
    return (
      <div className={`space-y-4 px-2 pb-6 ${className}`}>
        {data.map((row, index) => (
          <Card key={row[cardKey] || index} className="bg-white shadow-md rounded-2xl border-none overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((column) => {
                    const value = row[column.key];
                    const displayValue = column.render
                      ? column.render(value, row)
                      : value;

                    return (
                      <div
                        key={column.key}
                        className="flex justify-between items-center p-4"
                      >
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          {column.mobileLabel || column.label}
                        </span>
                        <div className="text-sm font-bold text-slate-800 text-right">
                          {displayValue}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
        {footer && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm mt-6">
            {footer}
          </div>
        )}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div className={`overflow-x-auto ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={row[cardKey] || index}>
              {columns.map((column) => {
                const value = row[column.key];
                const displayValue = column.render
                  ? column.render(value, row)
                  : value;

                return (
                  <TableCell key={column.key} className={column.className}>
                    {displayValue}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
        {footer && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={columns.length}>
                {footer}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
};

export default MobileTable;
