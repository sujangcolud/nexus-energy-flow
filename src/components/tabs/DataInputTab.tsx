
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Database, UploadCloud } from 'lucide-react';
import { format, parse } from 'date-fns';

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
  const [bulkData, setBulkData] = useState('');
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

  const saveData = async () => {
    if (!user || !dataType || !bulkData) {
      toast.error('Please select a data type and paste some data.');
      return;
    }

    setSaving(true);
    try {
      const fields = tableFields[dataType];
      const requiredFields = fields.filter(f => f.required).map(f => f.name);
      
      const rows = bulkData.trim().split('\n');
      const parsedData = rows.map((row, index) => {
        console.log(`Row ${index + 1} raw data: "${row}"`);
        const columns = row.split('\t');
        console.log(`Row ${index + 1} split into columns:`, columns);

        if (columns.length !== fields.length) {
          throw new Error(`Row ${index + 1} has ${columns.length} columns, but ${fields.length} were expected.`);
        }

        const rowData: any = {};
        fields.forEach((field, i) => {
          rowData[field.name] = columns[i].trim();
        });

        console.log(`Row ${index + 1} parsed into object:`, rowData);
        return rowData;
      });

      const validRows = parsedData.filter(row => {
        return requiredFields.every(field => row[field] && row[field].toString().trim() !== '');
      });

      if (validRows.length === 0) {
        toast.error('No valid rows found. Please ensure required fields are not empty.');
        return;
      }

      const transformedData = validRows.map(row => {
        const transformed: any = { ...row };
        transformed.user_id = user.id;

        fields.forEach(field => {
          if (field.type === 'number' && transformed[field.name]) {
            transformed[field.name] = parseFloat(transformed[field.name]) || 0;
          }
          if (field.type === 'date') {
            const dateString = transformed[field.name];
            if (dateString) {
              // Use date-fns's parse function for reliable parsing.
              // It requires a format string. We'll assume 'yyyy-MM-dd'.
              const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());
              if (!isNaN(parsedDate.getTime())) {
                transformed[field.name] = format(parsedDate, 'yyyy-MM-dd');
              } else {
                throw new Error(`Invalid date format for '${field.name}' (value: "${dateString}"). Please use YYYY-MM-DD.`);
              }
            } else {
              // If no date is provided, default to today.
              transformed[field.name] = format(new Date(), 'yyyy-MM-dd');
            }
          }
        });

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

      const { error } = await supabase.from(dataType).insert(transformedData);
      if (error) throw error;

      toast.success(`Successfully uploaded ${transformedData.length} records!`);
      setBulkData('');
      setDataType('');
    } catch (error: any) {
      console.error('Error saving bulk data:', error);
      toast.error(error.message || 'Failed to save data. Check format and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Bulk Data Input</h2>
      </div>

      {/* Data Input Area */}
      <Card>
        <CardHeader>
          <CardTitle>Copy and Paste Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium">Data Type *</label>
              <Select value={dataType} onValueChange={(value: DataType) => setDataType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data type to upload" />
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Paste Data from Spreadsheet</label>
            <Textarea
              placeholder="Copy data from Google Sheets, Excel, or a TSV file and paste it here. Each row should be on a new line, and each column separated by a tab."
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              rows={15}
              disabled={!dataType}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={saveData} disabled={saving || !dataType || !bulkData}>
              <UploadCloud className="h-4 w-4 mr-2" />
              {saving ? 'Uploading...' : 'Parse and Upload Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Field Guidelines */}
      {dataType && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Column Order for "{dataTypes.find(t => t.value === dataType)?.label}"</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800 mb-4">
              When you copy from your spreadsheet, ensure the columns are in the following order. Required fields are marked with <span className="text-red-500 font-bold">*</span>.
            </p>
            <div className="text-sm font-mono bg-white p-3 rounded">
              {tableFields[dataType].map((field, index) => (
                <span key={field.name}>
                  {field.name}
                  {field.required && <span className="text-red-500">*</span>}
                  {index < tableFields[dataType].length - 1 && <span className="text-gray-400 mx-1"> -&gt; </span>}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataInputTab;
