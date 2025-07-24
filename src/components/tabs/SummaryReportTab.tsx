import React, { useState, useEffect } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DateRangePicker } from '../ui/date-range-picker';

const SummaryReportTab: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('daily_summary')
          .select('*')
          .order('summary_date', { ascending: false });

        // Apply date filters only if date range is selected
        if (dateRange) {
          query = query
            .gte('summary_date', dateRange.from.toISOString())
            .lte('summary_date', dateRange.to.toISOString());
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching summary data:', error);
        } else {
          setData(data || []);
        }
      } catch (error) {
        console.error('Error fetching summary data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Load all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('daily_summary')
          .select('*')
          .order('summary_date', { ascending: false });

        if (error) {
          console.error('Error fetching all summary data:', error);
        } else {
          setData(data || []);
        }
      } catch (error) {
        console.error('Error fetching all summary data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

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
        <CardTitle>Daily Summary Report - All History</CardTitle>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Showing all daily summary records. Use date filter to narrow down results.
          </p>
          <DateRangePicker onUpdate={setDateRange} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading daily summary data...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {data.length > 0 && (
              <div className="text-sm text-gray-600">
                Showing {data.length} daily summary records
              </div>
            )}
            <div className="max-h-96 overflow-auto border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead className="font-semibold">Date</TableHead>
                    {Object.keys(summary).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at').map(key => (
                      <TableHead key={key} className="font-semibold text-xs">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </TableHead>
                    ))}
                  </TableRow>
                  {data.length > 0 && (
                    <TableRow className="bg-blue-50">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      {Object.entries(summary).filter(([key]) => key !== 'id' && key !== 'created_at' && key !== 'updated_at').map(([key, value], index) => (
                        <TableCell key={index} className="font-bold text-blue-700">
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={20} className="text-center py-8 text-gray-500">
                        No daily summary data found. Perform daily closing to generate data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map(row => (
                      <TableRow key={row.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{row.summary_date}</TableCell>
                        {Object.entries(summary).filter(([key]) => key !== 'id' && key !== 'created_at' && key !== 'updated_at').map(([key], index) => (
                          <TableCell key={index} className="text-sm">
                            {typeof row[key] === 'number' ? row[key].toFixed(2) : (row[key] || '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SummaryReportTab;
