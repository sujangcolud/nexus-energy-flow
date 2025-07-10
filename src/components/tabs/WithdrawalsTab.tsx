
import { useState } from 'react';
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

    // Mock submission
    console.log('Submitting withdrawal:', formData);
    toast.success('Withdrawal recorded successfully!');
    
    // Reset form
    setFormData({
      amount: '',
      purpose: '',
      recipient: '',
      method: '',
      reference: '',
      remarks: ''
    });
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
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              size="lg"
            >
              Record Withdrawal
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalsTab;
