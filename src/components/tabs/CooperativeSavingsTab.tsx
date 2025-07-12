
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
import { PiggyBank } from 'lucide-react';

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

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fetchRecentSavings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cooperative_savings')
        .select('*')
        .eq('user_id', user.id)
        .order('contribution_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

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
        <CardHeader>
          <CardTitle>Recent Savings Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="max-w-[200px]">Cooperative Name</TableHead>
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
                  savings.map((saving) => (
                    <TableRow key={saving.id}>
                      <TableCell>{new Date(saving.contribution_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium whitespace-normal break-words">{saving.member_id}</TableCell>
                      <TableCell className="text-right">Rs. {saving.contribution_amount.toFixed(2)}</TableCell>
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

export default CooperativeSavingsTab;
