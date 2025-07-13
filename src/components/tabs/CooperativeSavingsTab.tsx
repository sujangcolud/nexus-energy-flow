
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { PiggyBank, Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import useTableControls from '@/hooks/useTableControls';

interface Saving {
  id: string;
  contribution_amount: number;
  member_id: string;
  cycle_period: string | null;
  contribution_date: string;
}

const CooperativeSavingsTab = () => {
  const [savings, setSavings] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: '',
    cooperativeName: '',
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const {
    page,
    range,
    onPageChange,
    onRangeChange,
    itemsPerPage,
  } = useTableControls();

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fetchRecentSavings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('cooperative_savings')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      if (range?.from) {
        query = query.gte('contribution_date', format(range.from, 'yyyy-MM-dd'));
      }
      if (range?.to) {
        query = query.lte('contribution_date', format(range.to, 'yyyy-MM-dd'));
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setSavings(data || []);
    } catch (error) {
      console.error('Error fetching recent savings:', error);
      toast.error('Failed to load recent savings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentSavings();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.cooperativeName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to record a savings contribution.');
      return;
    }

    setIsSubmitting(true);
    try {
      const savingsData = {
        user_id: user.id,
        contribution_amount: parseFloat(formData.amount),
        member_id: formData.cooperativeName,
        cycle_period: formData.remarks || null,
        contribution_date: new Date().toISOString().split('T')[0],
      };

      const { error } = await supabase.from('cooperative_savings').insert([savingsData]);

      if (error) {
        throw error;
      }

      toast.success('Savings contribution recorded successfully!');
      setFormData({
        amount: '',
        cooperativeName: '',
        remarks: ''
      });
      fetchRecentSavings(); // Re-fetch after successful submission
    } catch (error: any) {
      console.error('Error recording savings:', error);
      toast.error(error.message || 'Failed to record savings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <PiggyBank className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Cooperative Savings</h2>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Record Savings Contribution</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NRs.) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter contribution amount"
                value={formData.amount}
                onChange={(e) => updateFormData('amount', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cooperativeName">Name of Cooperative *</Label>
              <Input
                id="cooperativeName"
                placeholder="Enter cooperative name"
                value={formData.cooperativeName}
                onChange={(e) => updateFormData('cooperativeName', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Additional notes about the contribution"
                value={formData.remarks}
                onChange={(e) => updateFormData('remarks', e.target.value)}
                rows={3}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-70"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Record Contribution'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Savings Table */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Savings Contributions</CardTitle>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !range && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range?.from ? (
                    range.to ? (
                      <>
                        {format(range.from, "LLL dd, y")} -{" "}
                        {format(range.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(range.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={range?.from}
                  selected={range}
                  onSelect={onRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[200px]">Cooperative Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : savings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">No recent savings found.</TableCell>
                  </TableRow>
                ) : (
                  <>
                    <TableRow className="bg-gray-100 font-semibold">
                      <TableCell colSpan={2} className="text-right font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">
                        Rs. {savings.reduce((acc, s) => acc + Number(s.contribution_amount), 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {savings.map((saving) => (
                      <TableRow key={saving.id}>
                        <TableCell>{new Date(saving.contribution_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium whitespace-normal break-words w-[200px]">{saving.member_id}</TableCell>
                        <TableCell className="text-right">Rs. {saving.contribution_amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
          {savings.length > 0 && (
            <div className="flex justify-center p-4">
              <Button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="p-2">
                Page {page}
              </span>
              <Button
                onClick={() => onPageChange(page + 1)}
                disabled={savings.length < itemsPerPage}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
      </Card>
    </div>
  );
};

export default CooperativeSavingsTab;
