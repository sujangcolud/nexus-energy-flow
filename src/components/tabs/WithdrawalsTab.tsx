
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
import { TrendingDown } from 'lucide-react';

interface Withdrawal {
  id: string;
  amount: number;
  purpose: string;
  recipient: string | null;
  reference_number: string | null;
  remarks: string | null;
  withdrawal_date: string;
}

const WithdrawalsTab = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
    recipient: '',
    referenceNumber: '',
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fetchRecentWithdrawals = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching recent withdrawals:', error);
      toast.error('Failed to load recent withdrawals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentWithdrawals();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.purpose) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to record a withdrawal.');
      return;
    }

    setIsSubmitting(true);
    try {
      const withdrawalData = {
        user_id: user.id,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        recipient: formData.recipient || null,
        reference_number: formData.referenceNumber || null,
        remarks: formData.remarks || null,
        withdrawal_date: new Date().toISOString().split('T')[0],
      };

      const { error } = await supabase.from('withdrawals').insert([withdrawalData]);

      if (error) {
        throw error;
      }

      toast.success('Withdrawal recorded successfully!');
      setFormData({
        amount: '',
        purpose: '',
        recipient: '',
        referenceNumber: '',
        remarks: ''
      });
      fetchRecentWithdrawals(); // Re-fetch after successful submission
    } catch (error: any) {
      console.error('Error recording withdrawal:', error);
      toast.error(error.message || 'Failed to record withdrawal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingDown className="h-6 w-6 text-red-600" />
        <h2 className="text-2xl font-bold text-gray-900">Withdrawals Management</h2>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Record New Withdrawal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Withdrawal Amount (NRs.) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter withdrawal amount"
                value={formData.amount}
                onChange={(e) => updateFormData('amount', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Input
                id="purpose"
                placeholder="Purpose of withdrawal"
                value={formData.purpose}
                onChange={(e) => updateFormData('purpose', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Name</Label>
              <Input
                id="recipient"
                placeholder="Name of recipient"
                value={formData.recipient}
                onChange={(e) => updateFormData('recipient', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                placeholder="Transaction reference number"
                value={formData.referenceNumber}
                onChange={(e) => updateFormData('referenceNumber', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Additional remarks"
                value={formData.remarks}
                onChange={(e) => updateFormData('remarks', e.target.value)}
                rows={3}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-70"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Record Withdrawal'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Withdrawals Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[200px]">Purpose</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No recent withdrawals found.</TableCell>
                  </TableRow>
                ) : (
                  <>
                    <TableRow className="bg-gray-100 font-semibold">
                      <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">
                        Rs. {withdrawals.reduce((acc, w) => acc + Number(w.amount), 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>{new Date(withdrawal.withdrawal_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium whitespace-normal break-words w-[200px]">{withdrawal.purpose}</TableCell>
                        <TableCell>{withdrawal.recipient || '-'}</TableCell>
                        <TableCell className="text-right">Rs. {withdrawal.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalsTab;
