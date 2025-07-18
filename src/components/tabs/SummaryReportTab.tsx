import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DateRangePicker } from '../ui/date-range-picker';

const SummaryReportTab: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      if (dateRange) {
        const { data, error } = await supabase
          .from('daily_summary')
          .select('*')
          .gte('summary_date', dateRange.from.toISOString())
          .lte('summary_date', dateRange.to.toISOString())
          .order('summary_date', { ascending: false });

        if (error) {
          console.error('Error fetching summary data:', error);
        } else {
          setData(data);
        }
      }
    };

    fetchData();
  }, [dateRange]);

  const summary = data.reduce((acc, row) => {
    Object.keys(row).forEach(key => {
      if (typeof row[key] === 'number') {
        acc[key] = (acc[key] || 0) + row[key];
      }
    });
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary Report</CardTitle>
        <DateRangePicker onUpdate={setDateRange} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {Object.keys(summary).map(key => (
                <TableHead key={key}>{key.replace(/_/g, ' ')}</TableHead>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Total</TableCell>
              {Object.values(summary).map((value, index) => (
                <TableCell key={index}>{value}</TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.summary_date}</TableCell>
                {Object.keys(summary).map(key => (
                  <TableCell key={key}>{row[key]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SummaryReportTab;
