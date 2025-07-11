
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
import { Receipt } from 'lucide-react';

const ExpensesTab = () => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    paymentMode: '',
    category: '',
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const expenseCategories = [
    'Electricity',
    'Rent',
    'Salary',
    'EV Electricity',
    'Restaurant',
    'Fuel/Travel',
    'Savings',
    'Dues Payment',
    'Labour Payment',
    'Commission',
    'Maintenance',
    'Account Opening Charge',
    'First Aid',
    'Others'
  ];

  const paymentModes = ['Cash', 'Esewa', 'Fonepay', 'Bank Transfer'];

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount || !formData.paymentMode || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to record an expense.');
      return;
    }

    setIsSubmitting(true);
    try {
      const expenseData = {
        user_id: user.id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        payment_mode: formData.paymentMode,
        category: formData.category,
        remarks: formData.remarks,
        expense_date: new Date().toISOString(),
      };

      const { error } = await supabase.from('expenses').insert([expenseData]);

      if (error) {
        throw error;
      }

      toast.success('Expense recorded successfully!');
      setFormData({ // Reset form
        description: '',
        amount: '',
        paymentMode: '',
        category: '',
        remarks: ''
      });
    } catch (error: any) {
      console.error('Error recording expense:', error);
      toast.error(error.message || 'Failed to record expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pt-4 md:pt-6"> {/* Added top padding */}
      <div className="flex items-center gap-3 mb-6">
        <Receipt className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Expenses Management</h2>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Record New Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="Enter expense description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (Rs.) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => updateFormData('amount', e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => updateFormData('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                'Record Expense'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesTab;
