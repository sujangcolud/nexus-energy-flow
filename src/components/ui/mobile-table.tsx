import React from "react";
import {
  Table,
  TableBody,
  TableCell,
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
}

const MobileTable: React.FC<MobileTableProps> = ({
  columns,
  data,
  loading,
  emptyMessage = "No data available",
  className,
  cardKey = "id",
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
      <div className={`space-y-3 ${className}`}>
        {data.map((row, index) => (
          <Card key={row[cardKey] || index} className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-2">
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
                        className="flex justify-between items-start"
                      >
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {column.mobileLabel || column.label}
                        </span>
                        <div className="text-sm text-gray-900 text-right max-w-[60%]">
                          {displayValue}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
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
      </Table>
    </div>
  );
};

export default MobileTable;
