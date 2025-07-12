
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { TrendingUp } from 'lucide-react';

interface Deposit {
  id: string;
  amount: number;
  mode: string;
  deposited_by: string;
  deposit_date: string;
}

const DepositsTab = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: '',
    mode: '',
    depositedBy: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const depositModes = ['Fonepay', 'Esewa', 'Bank Transfer', 'Cash Deposit', 'Cheque'];

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fetchRecentDeposits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('deposit_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching recent deposits:', error);
      toast.error('Failed to load recent deposits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentDeposits();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.mode || !formData.depositedBy) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to record a deposit.');
      return;
    }

    setIsSubmitting(true);
    try {
      const depositData = {
        user_id: user.id,
        amount: parseFloat(formData.amount),
        mode: formData.mode,
        deposited_by: formData.depositedBy,
        deposit_date: new Date().toISOString().split('T')[0],
      };

      const { error } = await supabase.from('deposits').insert([depositData]);

      if (error) {
        throw error;
      }

      toast.success('Deposit recorded successfully!');
      setFormData({
        amount: '',
        mode: '',
        depositedBy: ''
      });
      fetchRecentDeposits(); // Re-fetch after successful submission
    } catch (error: any) {
      console.error('Error recording deposit:', error);
      toast.error(error.message || 'Failed to record deposit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-6 w-6 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900">Deposits Management</h2>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Record New Deposit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Deposit Amount (NRs.) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter deposit amount"
                value={formData.amount}
                onChange={(e) => updateFormData('amount', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mode">Deposit Mode *</Label>
              <Select value={formData.mode} onValueChange={(value) => updateFormData('mode', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select deposit mode" />
                </SelectTrigger>
                <SelectContent>
                  {depositModes.map(mode => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="depositedBy">Deposited By *</Label>
              <Input
                id="depositedBy"
                placeholder="Name of person/organization making deposit"
                value={formData.depositedBy}
                onChange={(e) => updateFormData('depositedBy', e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-70"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Record Deposit'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Deposits Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Deposited By</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : deposits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No recent deposits found.</TableCell>
                  </TableRow>
                ) : (
                  deposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>{new Date(deposit.deposit_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{deposit.deposited_by}</TableCell>
                      <TableCell>{deposit.mode}</TableCell>
                      <TableCell className="text-right">Rs. {deposit.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DepositsTab;
