
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { TrendingUp } from 'lucide-react';

const DepositsTab = () => {
  const [formData, setFormData] = useState({
    amount: '',
    mode: '',
    depositedBy: '',
    reference: ''
  });

  const depositModes = ['Fonepay', 'Esewa', 'Bank Transfer', 'Cash Deposit', 'Cheque'];

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.mode || !formData.depositedBy) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Mock submission
    console.log('Submitting deposit:', formData);
    toast.success('Deposit recorded successfully!');
    
    // Reset form
    setFormData({
      amount: '',
      mode: '',
      depositedBy: '',
      reference: ''
    });
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
              <Label htmlFor="amount">Deposit Amount (Rs.) *</Label>
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
            
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number (Optional)</Label>
              <Input
                id="reference"
                placeholder="Transaction reference or receipt number"
                value={formData.reference}
                onChange={(e) => updateFormData('reference', e.target.value)}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              size="lg"
            >
              Record Deposit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DepositsTab;
