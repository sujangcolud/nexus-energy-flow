
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Save, Trash2, Database } from 'lucide-react';

type DataType = 'orders' | 'charging_sessions' | 'expenses' | 'deposits' | 'withdrawals' | 'cooperative_savings' | 'menu_items';

interface TableField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  required: boolean;
  options?: string[];
}

const DataInputTab = () => {
  const { user } = useAuth();
  const [dataType, setDataType] = useState<DataType | ''>('');
  const [numberOfRows, setNumberOfRows] = useState(5);
  const [tableData, setTableData] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const dataTypes = [
    { value: 'orders' as const, label: 'Orders' },
    { value: 'charging_sessions' as const, label: 'Charging Sessions' },
    { value: 'expenses' as const, label: 'Expenses' },
    { value: 'deposits' as const, label: 'Deposits' },
    { value: 'withdrawals' as const, label: 'Withdrawals' },
    { value: 'cooperative_savings' as const, label: 'Cooperative Savings' },
    { value: 'menu_items' as const, label: 'Menu Items' }
  ];

  const tableFields: { [key in DataType]: TableField[] } = {
    orders: [
      { name: 'item_name', type: 'text', required: true },
      { name: 'quantity', type: 'number', required: true },
      { name: 'rate', type: 'number', required: true },
      { name: 'total', type: 'number', required: true },
      { name: 'payment_mode', type: 'select', required: true, options: ['Cash', 'Esewa', 'Fonepay', 'Bank Transfer'] },
      { name: 'order_date', type: 'date', required: false }
    ],
    charging_sessions: [
      { name: 'total_amount', type: 'number', required: true },
      { name: 'payment_mode', type: 'select', required: true, options: ['Cash', 'Esewa', 'Fonepay', 'Bank Transfer'] },
      { name: 'start_percentage', type: 'number', required: false },
      { name: 'end_percentage', type: 'number', required: false },
      { name: 'kcal', type: 'number', required: false },
      { name: 'per_unit_rate', type: 'number', required: false },
      { name: 'per_percent_rate', type: 'number', required: false },
      { name: 'session_date', type: 'date', required: false }
    ],
    expenses: [
      { name: 'description', type: 'text', required: true },
      { name: 'amount', type: 'number', required: true },
      { name: 'category', type: 'select', required: true, options: ['Electricity', 'Rent', 'Salary', 'EV Electricity', 'Restaurant', 'Fuel/Travel', 'Savings', 'Dues Payment', 'Labour Payment', 'Commission', 'Maintenance', 'Account Opening Charge', 'First Aid', 'Others'] },
      { name: 'payment_mode', type: 'select', required: true, options: ['Cash', 'Esewa', 'Fonepay', 'Bank Transfer'] },
      { name: 'remarks', type: 'text', required: false },
      { name: 'expense_date', type: 'date', required: false }
    ],
    deposits: [
      { name: 'amount', type: 'number', required: true },
      { name: 'deposited_by', type: 'text', required: true },
      { name: 'mode', type: 'select', required: true, options: ['Cash', 'Esewa', 'Fonepay', 'Bank Transfer'] },
      { name: 'deposit_date', type: 'date', required: false }
    ],
    withdrawals: [
      { name: 'amount', type: 'number', required: true },
      { name: 'purpose', type: 'text', required: true },
      { name: 'recipient', type: 'text', required: false },
      { name: 'reference_number', type: 'text', required: false },
      { name: 'remarks', type: 'text', required: false },
      { name: 'withdrawal_date', type: 'date', required: false }
    ],
    cooperative_savings: [
      { name: 'member_id', type: 'text', required: true },
      { name: 'contribution_amount', type: 'number', required: true },
      { name: 'cycle_period', type: 'text', required: true },
      { name: 'contribution_date', type: 'date', required: false }
    ],
    menu_items: [
      { name: 'name', type: 'text', required: true },
      { name: 'price', type: 'number', required: true },
      { name: 'category', type: 'text', required: true },
      { name: 'description', type: 'text', required: false },
      { name: 'is_available', type: 'select', required: false, options: ['true', 'false'] }
    ]
  };

  const generateTable = () => {
    if (!dataType) {
      toast.error('Please select a data type');
      return;
    }

    const fields = tableFields[dataType];
    const emptyRows = Array.from({ length: numberOfRows }, () => {
      const row: any = {};
      fields.forEach(field => {
        row[field.name] = '';
      });
      return row;
    });

    setTableData(emptyRows);
  };

  const updateCellValue = (rowIndex: number, fieldName: string, value: string) => {
    const updatedData = [...tableData];
    updatedData[rowIndex][fieldName] = value;
    setTableData(updatedData);
  };

  const addRow = () => {
    if (!dataType) return;
    
    const fields = tableFields[dataType];
    const newRow: any = {};
    fields.forEach(field => {
      newRow[field.name] = '';
    });
    setTableData([...tableData, newRow]);
  };

  const removeRow = (index: number) => {
    const updatedData = tableData.filter((_, i) => i !== index);
    setTableData(updatedData);
  };

  const saveData = async () => {
    if (!user || !dataType || tableData.length === 0) {
      toast.error('Please generate table and fill in data');
      return;
    }

    setSaving(true);
    try {
      // Validate required fields
      const fields = tableFields[dataType];
      const requiredFields = fields.filter(f => f.required).map(f => f.name);
      
      const validRows = tableData.filter(row => {
        return requiredFields.every(field => row[field] && row[field].toString().trim() !== '');
      });

      if (validRows.length === 0) {
        toast.error('Please fill in at least one complete row with all required fields');
        return;
      }

      // Transform data for database
      const transformedData = validRows.map(row => {
        const transformed: any = { ...row };
        
        // Add user_id to all records
        transformed.user_id = user.id;

        // Type-specific transformations
        fields.forEach(field => {
          if (field.type === 'number' && transformed[field.name]) {
            transformed[field.name] = parseFloat(transformed[field.name]) || 0;
          }
          if (field.type === 'date' && !transformed[field.name]) {
            transformed[field.name] = new Date().toISOString().split('T')[0];
          }
        });

        // Special handling for menu items (no user_id)
        if (dataType === 'menu_items') {
          delete transformed.user_id;
          if (transformed.is_available === 'false') {
            transformed.is_available = false;
          } else {
            transformed.is_available = true;
          }
        }

        return transformed;
      });

      // Save to database
      const { error } = await supabase
        .from(dataType)
        .insert(transformedData);

      if (error) throw error;

      toast.success(`Successfully saved ${transformedData.length} records!`);
      setTableData([]);
      setDataType('');
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Failed to save data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (rowIndex: number, field: TableField, value: string) => {
    if (field.type === 'select') {
      return (
        <Select
          value={value}
          onValueChange={(newValue) => updateCellValue(rowIndex, field.name, newValue)}
        >
          <SelectTrigger className="w-full min-w-[120px]">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={field.type === 'number' ? 'number' : field.type}
        value={value}
        onChange={(e) => updateCellValue(rowIndex, field.name, e.target.value)}
        className="min-w-[120px]"
        placeholder={field.required ? 'Required' : 'Optional'}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Data Input</h2>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configure Data Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Type *</label>
              <Select value={dataType} onValueChange={(value: DataType) => setDataType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  {dataTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Rows</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={numberOfRows}
                onChange={(e) => setNumberOfRows(parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button onClick={generateTable} className="w-full">
                Generate Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {dataType && tableData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Data Entry Table - {dataTypes.find(t => t.value === dataType)?.label}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={addRow}>
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
              <Button onClick={saveData} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save All Data'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {tableFields[dataType].map((field) => (
                      <TableHead key={field.name} className="min-w-[120px]">
                        {field.name.replace(/_/g, ' ').toUpperCase()}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </TableHead>
                    ))}
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="text-center">{rowIndex + 1}</TableCell>
                      {tableFields[dataType].map((field) => (
                        <TableCell key={field.name}>
                          {renderCell(rowIndex, field, row[field.name] || '')}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeRow(rowIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Instructions:</strong> Fill in the required fields (marked with *) for each row. 
                Date fields will default to today if left empty. Click "Save All Data" when ready.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Guidelines */}
      {dataType && (
        <Card>
          <CardHeader>
            <CardTitle>Field Guidelines for {dataTypes.find(t => t.value === dataType)?.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {tableFields[dataType].map((field) => (
                <div key={field.name} className="flex justify-between">
                  <span className="font-medium">{field.name.replace(/_/g, ' ')}</span>
                  <span className={field.required ? 'text-red-600' : 'text-gray-500'}>
                    {field.required ? 'Required' : 'Optional'} ({field.type})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataInputTab;
