
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';

const ChargingTab = () => {
  const [formData, setFormData] = useState({
    startPercent: '',
    endPercent: '',
    perPercentRate: '',
    kcal: '',
    perUnitRate: '',
    paymentMode: '',
    totalAmount: ''
  });

  const updateFormData = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-calculate total amount
    if (['startPercent', 'endPercent', 'perPercentRate', 'kcal', 'perUnitRate'].includes(field)) {
      const start = parseFloat(newData.startPercent) || 0;
      const end = parseFloat(newData.endPercent) || 0;
      const perPercent = parseFloat(newData.perPercentRate) || 0;
      const kcal = parseFloat(newData.kcal) || 0;
      const perUnit = parseFloat(newData.perUnitRate) || 0;
      
      let amount1 = 0, amount2 = 0;
      if (end > start && perPercent) {
        amount1 = (end - start) * perPercent;
      }
      if (kcal && perUnit) {
        amount2 = kcal * perUnit;
      }
      
      const total = amount1 + amount2;
      newData.totalAmount = total > 0 ? total.toFixed(2) : '';
    }
    
    setFormData(newData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.totalAmount || !formData.paymentMode) {
      toast.error('Please fill in the charging details and select payment mode');
      return;
    }

    // Mock submission
    console.log('Submitting charging data:', formData);
    toast.success('Charging session submitted successfully!');
    
    // Reset form
    setFormData({
      startPercent: '',
      endPercent: '',
      perPercentRate: '',
      kcal: '',
      perUnitRate: '',
      paymentMode: '',
      totalAmount: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Charging Management</h2>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>New Charging Session</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startPercent">Start Percentage (%)</Label>
                <Input
                  id="startPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Start %"
                  value={formData.startPercent}
                  onChange={(e) => updateFormData('startPercent', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endPercent">End Percentage (%)</Label>
                <Input
                  id="endPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="End %"
                  value={formData.endPercent}
                  onChange={(e) => updateFormData('endPercent', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="perPercentRate">Rate per Percent (Rs.)</Label>
                <Input
                  id="perPercentRate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Per % rate"
                  value={formData.perPercentRate}
                  onChange={(e) => updateFormData('perPercentRate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="kcal">Energy Consumed (kWh)</Label>
                <Input
                  id="kcal"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="kWh"
                  value={formData.kcal}
                  onChange={(e) => updateFormData('kcal', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="perUnitRate">Rate per Unit (Rs.)</Label>
                <Input
                  id="perUnitRate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Per unit rate"
                  value={formData.perUnitRate}
                  onChange={(e) => updateFormData('perUnitRate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select value={formData.paymentMode} onValueChange={(value) => updateFormData('paymentMode', value)}>
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
            
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount (Rs.)</Label>
              <Input
                id="totalAmount"
                type="text"
                placeholder="Auto-calculated"
                value={formData.totalAmount}
                readOnly
                className="bg-gray-50 font-semibold text-lg"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
            >
              Submit Charging Session
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChargingTab;
