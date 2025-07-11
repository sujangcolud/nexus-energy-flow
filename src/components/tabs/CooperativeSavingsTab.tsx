
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Users, Plus, Trash2 } from 'lucide-react';

interface CooperativeSaving {
  id: string;
  member_id: string;
  contribution_amount: number;
  contribution_date: string;
  cycle_period: string;
  created_at: string;
}

const CooperativeSavingsTab = () => {
  const { user } = useAuth();
  const [savings, setSavings] = useState<CooperativeSaving[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [memberId, setMemberId] = useState('');
  const [contributionAmount, setContributionAmount] = useState(0);
  const [cyclePeriod, setCyclePeriod] = useState('');

  const cyclePeriods = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annual', label: 'Annual' }
  ];

  const fetchSavings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cooperative_savings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavings(data || []);
    } catch (error) {
      console.error('Error fetching cooperative savings:', error);
      toast.error('Failed to load cooperative savings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavings();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !memberId || !cyclePeriod || contributionAmount <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('cooperative_savings')
        .insert({
          user_id: user.id,
          member_id: memberId,
          contribution_amount: contributionAmount,
          cycle_period: cyclePeriod
        });

      if (error) throw error;

      toast.success('Cooperative saving recorded successfully!');
      
      // Reset form
      setMemberId('');
      setContributionAmount(0);
      setCyclePeriod('');
      
      // Refresh savings
      fetchSavings();
    } catch (error) {
      console.error('Error recording cooperative saving:', error);
      toast.error('Failed to record cooperative saving');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cooperative_savings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Cooperative saving deleted successfully');
      fetchSavings();
    } catch (error) {
      console.error('Error deleting cooperative saving:', error);
      toast.error('Failed to delete cooperative saving');
    }
  };

  const totalSavings = savings.reduce((sum, saving) => sum + Number(saving.contribution_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Cooperative Savings</h2>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Savings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Rs. {totalSavings.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Savings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{savings.length}</div>
              <div className="text-sm text-gray-600">Total Contributions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {savings.length > 0 ? (totalSavings / savings.length).toFixed(0) : 0}
              </div>
              <div className="text-sm text-gray-600">Avg. Contribution</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Saving Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Record New Contribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Member ID</label>
              <Input
                type="text"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="Enter member ID"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Contribution Amount (Rs.)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Cycle Period</label>
              <Select value={cyclePeriod} onValueChange={setCyclePeriod} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select cycle period" />
                </SelectTrigger>
                <SelectContent>
                  {cyclePeriods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Recording...' : 'Record Contribution'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Savings List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Contributions ({savings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading savings...</div>
          ) : savings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No savings recorded yet. Add your first contribution above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Cycle Period</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savings.map((saving) => (
                    <TableRow key={saving.id}>
                      <TableCell className="font-medium">{saving.member_id}</TableCell>
                      <TableCell>Rs. {saving.contribution_amount}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {saving.cycle_period}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(saving.contribution_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(saving.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CooperativeSavingsTab;
