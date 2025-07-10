
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PiggyBank } from 'lucide-react';

const CooperativeSavingsTab = () => {
  const [formData, setFormData] = useState({
    memberId: '',
    memberName: '',
    contributionAmount: '',
    cycle: '',
    paymentMode: '',
    remarks: ''
  });

  const cycles = ['Monthly', 'Quarterly', 'Half-yearly', 'Annual'];
  const paymentModes = ['Cash', 'Bank Transfer', 'Digital Payment'];

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.memberId || !formData.memberName || !formData.contributionAmount || !formData.cycle || !formData.paymentMode) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Mock submission
    console.log('Submitting cooperative savings:', formData);
    toast.success('Cooperative savings contribution recorded successfully!');
    
    // Reset form
    setFormData({
      memberId: '',
      memberName: '',
      contributionAmount: '',
      cycle: '',
      paymentMode: '',
      remarks: ''
    });
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberId">Member ID *</Label>
                <Input
                  id="memberId"
                  placeholder="Enter member ID"
                  value={formData.memberId}
                  onChange={(e) => updateFormData('memberId', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="memberName">Member Name *</Label>
                <Input
                  id="memberName"
                  placeholder="Enter member name"
                  value={formData.memberName}
                  onChange={(e) => updateFormData('memberName', e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contributionAmount">Contribution Amount (Rs.) *</Label>
              <Input
                id="contributionAmount"
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter contribution amount"
                value={formData.contributionAmount}
                onChange={(e) => updateFormData('contributionAmount', e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cycle">Contribution Cycle *</Label>
                <Select value={formData.cycle} onValueChange={(value) => updateFormData('cycle', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map(cycle => (
                      <SelectItem key={cycle} value={cycle}>{cycle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode *</Label>
                <Select value={formData.paymentMode} onValueChange={(value) => updateFormData('paymentMode', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map(mode => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Input
                id="remarks"
                placeholder="Additional notes"
                value={formData.remarks}
                onChange={(e) => updateFormData('remarks', e.target.value)}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
            >
              Record Contribution
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CooperativeSavingsTab;
