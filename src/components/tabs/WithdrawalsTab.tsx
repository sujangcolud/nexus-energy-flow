
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { TrendingDown } from 'lucide-react';

const WithdrawalsTab = () => {
  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
    recipient: '',
    method: '',
    reference: '',
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const withdrawalMethods = ['Cash', 'Bank Transfer', 'Cheque', 'Digital Payment'];

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.purpose || !formData.recipient || !formData.method) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to record a withdrawal.');
      return;
    }

    setIsSubmitting(true);
    try {
      const withdrawalData: any = { // Use 'any' type temporarily for dynamic property setting
        user_id: user.id,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        withdrawal_date: new Date().toISOString(),
      };

      // Add optional fields from your provided list if they exist in formData and are not empty
      // Based on your list: 'recipient', 'method', 'reference', 'remarks' are not standard fields for withdrawals.
      // If you have columns for these in Supabase and want to save them, ensure they are listed in your schema.
      // For now, sticking to the schema provided: only amount and purpose are core.

      // Example of how you might add an optional field if it *was* in your schema:
      // if (formData.remarks) {
      //   withdrawalData.remarks = formData.remarks;
      // }

      const { error } = await supabase.from('withdrawals').insert([withdrawalData]);

      if (error) {
        throw error;
      }

      toast.success('Withdrawal recorded successfully!');
      setFormData({ // Reset form
        amount: '',
        purpose: '',
        recipient: '',
        method: '',
        reference: '',
        remarks: ''
      });
    } catch (error: any) {
      console.error('Error recording withdrawal:', error);
      toast.error(error.message || 'Failed to record withdrawal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6"> {/* Removed top padding pt-4 md:pt-6 */}
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
              <Label htmlFor="amount">Withdrawal Amount (Rs.) *</Label>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient *</Label>
                <Input
                  id="recipient"
                  placeholder="Name of recipient"
                  value={formData.recipient}
                  onChange={(e) => updateFormData('recipient', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="method">Withdrawal Method *</Label>
                <Select value={formData.method} onValueChange={(value) => updateFormData('method', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {withdrawalMethods.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number (Optional)</Label>
              <Input
                id="reference"
                placeholder="Transaction reference or receipt number"
                value={formData.reference}
                onChange={(e) => updateFormData('reference', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Additional notes or remarks"
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
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Recording...
                </>
              ) : (
                'Record Withdrawal'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalsTab;
