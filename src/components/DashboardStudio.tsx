
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  Save,
  Plus,
  Trash2,
  Edit
} from "lucide-react";

interface CustomCalculation {
  id: string;
  name: string;
  description: string;
  formula: string;
  chart_type: 'bar' | 'line' | 'pie' | 'area';
  created_at: string;
}

interface CalculationResult {
  name: string;
  value: number;
  data?: any[];
}

const DashboardStudio = () => {
  const { user } = useAuth();
  const [calculations, setCalculations] = useState<CustomCalculation[]>([]);
  const [results, setResults] = useState<CalculationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    formula: '',
    chart_type: 'bar' as const
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCalculations();
    }
  }, [user]);

  const fetchCalculations = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Since custom_calculations table doesn't exist, we'll use a mock implementation
      // In a real scenario, you would fetch from the actual table
      const mockCalculations: CustomCalculation[] = [
        {
          id: '1',
          name: 'Monthly Revenue Trend',
          description: 'Track revenue trends over the last 6 months',
          formula: 'SUM(orders.total) GROUP BY MONTH',
          chart_type: 'line',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Expense Categories',
          description: 'Breakdown of expenses by category',
          formula: 'SUM(expenses.amount) GROUP BY category',
          chart_type: 'pie',
          created_at: new Date().toISOString()
        }
      ];
      
      setCalculations(mockCalculations);
      await executeCalculations(mockCalculations);
    } catch (error) {
      console.error("Error fetching calculations:", error);
      toast.error("Failed to fetch calculations");
    } finally {
      setIsLoading(false);
    }
  };

  const executeCalculations = async (calcs: CustomCalculation[]) => {
    const calculationResults: CalculationResult[] = [];
    
    for (const calc of calcs) {
      try {
        let result: CalculationResult;
        
        if (calc.name === 'Monthly Revenue Trend') {
          // Mock data for monthly revenue trend
          const monthlyData = [
            { month: 'Jan', revenue: 12500 },
            { month: 'Feb', revenue: 15800 },
            { month: 'Mar', revenue: 18200 },
            { month: 'Apr', revenue: 16900 },
            { month: 'May', revenue: 21300 },
            { month: 'Jun', revenue: 24500 }
          ];
          
          result = {
            name: calc.name,
            value: monthlyData.reduce((sum, item) => sum + item.revenue, 0),
            data: monthlyData
          };
        } else if (calc.name === 'Expense Categories') {
          // Fetch actual expense data
          const { data: expenseData, error } = await supabase
            .from('expenses')
            .select('category, amount')
            .gte('expense_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
          
          if (error) throw error;
          
          const categoryTotals: { [key: string]: number } = {};
          expenseData?.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
          });
          
          const pieData = Object.entries(categoryTotals).map(([category, amount]) => ({
            category,
            amount,
            name: category
          }));
          
          result = {
            name: calc.name,
            value: Object.values(categoryTotals).reduce((sum, val) => sum + val, 0),
            data: pieData
          };
        } else {
          result = {
            name: calc.name,
            value: 0,
            data: []
          };
        }
        
        calculationResults.push(result);
      } catch (error) {
        console.error(`Error executing calculation ${calc.name}:`, error);
      }
    }
    
    setResults(calculationResults);
  };

  const saveCalculation = async () => {
    if (!user || !formData.name || !formData.formula) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // In a real implementation, this would save to the database
      const newCalculation: CustomCalculation = {
        id: editingId || Date.now().toString(),
        name: formData.name,
        description: formData.description,
        formula: formData.formula,
        chart_type: formData.chart_type,
        created_at: new Date().toISOString()
      };

      if (editingId) {
        setCalculations(prev => prev.map(calc => 
          calc.id === editingId ? newCalculation : calc
        ));
        toast.success("Calculation updated successfully!");
      } else {
        setCalculations(prev => [...prev, newCalculation]);
        toast.success("Calculation created successfully!");
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        formula: '',
        chart_type: 'bar'
      });
      setEditingId(null);
      
      // Re-execute calculations
      await executeCalculations(calculations);
    } catch (error) {
      console.error("Error saving calculation:", error);
      toast.error("Failed to save calculation");
    }
  };

  const editCalculation = (calc: CustomCalculation) => {
    setFormData({
      name: calc.name,
      description: calc.description,
      formula: calc.formula,
      chart_type: calc.chart_type
    });
    setEditingId(calc.id);
  };

  const deleteCalculation = (id: string) => {
    setCalculations(prev => prev.filter(calc => calc.id !== id));
    setResults(prev => prev.filter(result => 
      calculations.find(calc => calc.id === id)?.name !== result.name
    ));
    toast.success("Calculation deleted successfully!");
  };

  const renderChart = (result: CalculationResult, chartType: string) => {
    if (!result.data || result.data.length === 0) return null;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={result.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`NRs. ${value}`, 'Revenue']} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={result.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {result.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`NRs. ${value}`, 'Amount']} />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={result.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => [`NRs. ${value}`, 'Amount']} />
              <Legend />
              <Bar dataKey="amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Studio</h1>
          <p className="text-gray-600">Create and manage custom calculations and visualizations</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calculator className="h-4 w-4" />
          {calculations.length} Calculations
        </Badge>
      </div>

      {/* Create/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingId ? 'Edit Calculation' : 'Create New Calculation'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter calculation name"
              />
            </div>
            <div>
              <Label htmlFor="chart_type">Chart Type</Label>
              <Select
                value={formData.chart_type}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, chart_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter description (optional)"
            />
          </div>
          
          <div>
            <Label htmlFor="formula">Formula *</Label>
            <Textarea
              id="formula"
              value={formData.formula}
              onChange={(e) => setFormData(prev => ({ ...prev, formula: e.target.value }))}
              placeholder="Enter calculation formula (e.g., SUM(orders.total) GROUP BY category)"
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={saveCalculation} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {editingId ? 'Update' : 'Create'} Calculation
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ name: '', description: '', formula: '', chart_type: 'bar' });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {calculations.map((calc) => {
          const result = results.find(r => r.name === calc.name);
          return (
            <Card key={calc.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">{calc.name}</CardTitle>
                  {calc.description && (
                    <p className="text-sm text-gray-600">{calc.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editCalculation(calc)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCalculation(calc.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-4">
                    <div className="text-2xl font-bold text-green-600">
                      Total: NRs. {result.value.toFixed(2)}
                    </div>
                    {renderChart(result, calc.chart_type)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {calculations.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Calculator className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No calculations yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first custom calculation to get started with dashboard analytics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardStudio;
