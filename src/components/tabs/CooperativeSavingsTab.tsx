
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Users, Plus, Trash2 } from 'lucide-react';

interface CooperativeSaving {
  id: string;
  member_id: string;
  contribution_amount: number;
  cycle_period: string;
  contribution_date: string;
  created_at: string;
}

const CooperativeSavingsTab = () => {
  const { user } = useAuth();
  const [savings, setSavings] = useState<CooperativeSaving[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Reformed form fields: Amount, Name of Cooperative, Remarks
  const [amount, setAmount] = useState('');
  const [cooperativeName, setCooperativeName] = useState('');
  const [remarks, setRemarks] = useState('');

  const fetchSavings = async () => {
    if (!user) return;
    
    console.log('Fetching cooperative savings for user:', user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cooperative_savings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching savings:', error);
        throw error;
      }
      
      console.log('Savings fetched successfully:', data);
      setSavings(data || []);
    } catch (error) {
      console.error('Error fetching savings:', error);
      toast.error('Failed to load savings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavings();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !amount || !cooperativeName) {
      toast.error('Please fill in all required fields');
      return;
    }

    const savingsData = {
      user_id: user.id,
      member_id: cooperativeName, // Using cooperative name as member_id
      contribution_amount: parseFloat(amount),
      cycle_period: remarks || 'Monthly' // Using remarks as cycle_period or default to Monthly
    };

    console.log('Submitting cooperative savings:', savingsData);
    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('cooperative_savings')
        .insert(savingsData);

      if (error) {
        console.error('Error inserting savings:', error);
        throw error;
      }

      console.log('Savings inserted successfully');
      toast.success('Cooperative savings added successfully!');
      
      // Reset form
      setAmount('');
      setCooperativeName('');
      setRemarks('');
      
      // Refresh data
      fetchSavings();
    } catch (error) {
      console.error('Error submitting savings:', error);
      toast.error('Failed to add savings');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    console.log('Deleting savings:', id);
    try {
      const { error } = await supabase
        .from('cooperative_savings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('Savings deleted successfully');
      toast.success('Savings deleted successfully');
      fetchSavings();
    } catch (error) {
      console.error('Error deleting savings:', error);
      toast.error('Failed to delete savings');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Cooperative Savings</h2>
      </div>

      {/* Add New Savings - Reformed Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Savings Contribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (Rs.) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Name of Cooperative *</label>
                <Input
                  type="text"
                  placeholder="Enter cooperative name"
                  value={cooperativeName}
                  onChange={(e) => setCooperativeName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Textarea
                placeholder="Additional notes or remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full md:w-auto"
            >
              {submitting ? 'Adding...' : 'Add Contribution'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Savings List */}
      <Card>
        <CardHeader>
          <CardTitle>Savings History ({savings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading savings...</div>
          ) : savings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No savings contributions found. Add your first contribution above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Cooperative Name</TableHead>
                    <TableHead className="whitespace-nowrap">Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Remarks</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savings.map((saving) => (
                    <TableRow key={saving.id}>
                      <TableCell className="font-medium">{saving.member_id}</TableCell>
                      <TableCell>Rs. {saving.contribution_amount}</TableCell>
                      <TableCell>{saving.cycle_period}</TableCell>
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
