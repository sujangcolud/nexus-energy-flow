
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
import { Zap, Plus, Trash2 } from 'lucide-react';

interface ChargingSession {
  id: string;
  start_percentage: number;
  end_percentage: number;
  per_percent_rate: number;
  kcal: number;
  per_unit_rate: number;
  total_amount: number;
  payment_mode: string;
  session_date: string;
  created_at: string;
}

const ChargingTab = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [startPercentage, setStartPercentage] = useState(0);
  const [endPercentage, setEndPercentage] = useState(0);
  const [perPercentRate, setPerPercentRate] = useState(0);
  const [kcal, setKcal] = useState(0);
  const [perUnitRate, setPerUnitRate] = useState(0);
  const [paymentMode, setPaymentMode] = useState('');

  const fetchSessions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('charging_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching charging sessions:', error);
      toast.error('Failed to load charging sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const calculateTotal = () => {
    let percentageAmount = 0;
    let unitAmount = 0;
    
    if (endPercentage > startPercentage && perPercentRate > 0) {
      percentageAmount = (endPercentage - startPercentage) * perPercentRate;
    }
    
    if (kcal > 0 && perUnitRate > 0) {
      unitAmount = kcal * perUnitRate;
    }
    
    return percentageAmount + unitAmount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !paymentMode) {
      toast.error('Please fill all required fields');
      return;
    }

    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      toast.error('Please enter valid charging data');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('charging_sessions')
        .insert({
          user_id: user.id,
          start_percentage: startPercentage || null,
          end_percentage: endPercentage || null,
          per_percent_rate: perPercentRate || null,
          kcal: kcal || null,
          per_unit_rate: perUnitRate || null,
          total_amount: totalAmount,
          payment_mode: paymentMode
        });

      if (error) throw error;

      toast.success('Charging session submitted successfully!');
      
      // Reset form
      setStartPercentage(0);
      setEndPercentage(0);
      setPerPercentRate(0);
      setKcal(0);
      setPerUnitRate(0);
      setPaymentMode('');
      
      // Refresh sessions
      fetchSessions();
    } catch (error) {
      console.error('Error submitting charging session:', error);
      toast.error('Failed to submit charging session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('charging_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Charging session deleted successfully');
      fetchSessions();
    } catch (error) {
      console.error('Error deleting charging session:', error);
      toast.error('Failed to delete charging session');
    }
  };

  return (
    <div className="space-y-6"> {/* Removed top padding pt-4 md:pt-6 */}
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-600" />
        <h2 className="text-xl font-semibold text-gray-900">Charging Sessions</h2>
      </div>

      {/* Charging Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Charging Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Percentage (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={startPercentage}
                  onChange={(e) => setStartPercentage(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">End Percentage (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={endPercentage}
                  onChange={(e) => setEndPercentage(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Rate per % (Rs.)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={perPercentRate}
                  onChange={(e) => setPerPercentRate(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">kCal</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={kcal}
                  onChange={(e) => setKcal(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Rate per Unit (Rs.)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={perUnitRate}
                  onChange={(e) => setPerUnitRate(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Mode</label>
                <Select value={paymentMode} onValueChange={setPaymentMode} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Esewa">Esewa</SelectItem>
                    <SelectItem value="Fonepay">Fonepay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <div className="text-lg font-medium text-gray-900">
                Total Amount: Rs. {calculateTotal().toFixed(2)}
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Session'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Charging Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No charging sessions found. Create your first session above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start %</TableHead>
                    <TableHead>End %</TableHead>
                    <TableHead>Rate/%</TableHead>
                    <TableHead>kCal</TableHead>
                    <TableHead>Rate/Unit</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.start_percentage || '-'}</TableCell>
                      <TableCell>{session.end_percentage || '-'}</TableCell>
                      <TableCell>{session.per_percent_rate || '-'}</TableCell>
                      <TableCell>{session.kcal || '-'}</TableCell>
                      <TableCell>{session.per_unit_rate || '-'}</TableCell>
                      <TableCell>Rs. {session.total_amount}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{session.payment_mode}</Badge>
                      </TableCell>
                      <TableCell>{new Date(session.session_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(session.id)}
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

export default ChargingTab;
