import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle } from 'lucide-react';

type DataType = 'orders' | 'charging_sessions' | 'expenses' | 'deposits' | 'withdrawals' | 'cooperative_savings' | 'menu_items';

const FileUploadTab = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dataType, setDataType] = useState<DataType | ''>('');
  const [file, setFile] = useState<File | null>(null);

  const dataTypes = [
    { value: 'orders' as const, label: 'Orders' },
    { value: 'charging_sessions' as const, label: 'Charging Sessions' },
    { value: 'expenses' as const, label: 'Expenses' },
    { value: 'deposits' as const, label: 'Deposits' },
    { value: 'withdrawals' as const, label: 'Withdrawals' },
    { value: 'cooperative_savings' as const, label: 'Cooperative Savings' },
    { value: 'menu_items' as const, label: 'Menu Items' }
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.type === 'application/json') {
        setFile(selectedFile);
      } else {
        toast.error('Please select a CSV or JSON file');
        event.target.value = '';
      }
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }
    return data;
  };

  const validateData = (data: any[], type: string): boolean => {
    if (!data || data.length === 0) return false;

    const requiredFields: { [key: string]: string[] } = {
      orders: ['item_name', 'quantity', 'rate', 'total', 'payment_mode'],
      charging_sessions: ['total_amount', 'payment_mode'],
      expenses: ['description', 'amount', 'category', 'payment_mode'],
      deposits: ['amount', 'deposited_by', 'mode'],
      withdrawals: ['amount', 'purpose'],
      cooperative_savings: ['member_id', 'contribution_amount', 'cycle_period'],
      menu_items: ['name', 'price', 'category']
    };

    const required = requiredFields[type];
    if (!required) return false;

    return data.every(row => 
      required.every(field => row.hasOwnProperty(field) && row[field] !== '')
    );
  };

  const transformData = (data: any[], type: string) => {
    return data.map(row => {
      const transformed: any = { ...row };
      
      // Add user_id to all records
      if (user) {
        transformed.user_id = user.id;
      }

      // Type-specific transformations
      switch (type) {
        case 'orders':
          transformed.quantity = parseInt(transformed.quantity) || 1;
          transformed.rate = parseFloat(transformed.rate) || 0;
          transformed.total = parseFloat(transformed.total) || 0;
          break;
        case 'charging_sessions':
          transformed.total_amount = parseFloat(transformed.total_amount) || 0;
          if (transformed.start_percentage) transformed.start_percentage = parseFloat(transformed.start_percentage);
          if (transformed.end_percentage) transformed.end_percentage = parseFloat(transformed.end_percentage);
          if (transformed.kcal) transformed.kcal = parseFloat(transformed.kcal);
          break;
        case 'expenses':
          transformed.amount = parseFloat(transformed.amount) || 0;
          break;
        case 'deposits':
          transformed.amount = parseFloat(transformed.amount) || 0;
          break;
        case 'withdrawals':
          transformed.amount = parseFloat(transformed.amount) || 0;
          break;
        case 'cooperative_savings':
          transformed.contribution_amount = parseFloat(transformed.contribution_amount) || 0;
          break;
        case 'menu_items':
          transformed.price = parseFloat(transformed.price) || 0;
          transformed.is_available = transformed.is_available !== 'false';
          break;
      }

      return transformed;
    });
  };

  const handleUpload = async () => {
    if (!file || !dataType || !user) {
      toast.error('Please select a file and data type');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const fileText = await file.text();
      let data: any[];

      if (file.type === 'application/json') {
        data = JSON.parse(fileText);
      } else {
        data = parseCSV(fileText);
      }

      if (!validateData(data, dataType)) {
        toast.error('Invalid data format. Please check your file structure.');
        return;
      }

      const transformedData = transformData(data, dataType);
      const batchSize = 100;
      const totalBatches = Math.ceil(transformedData.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = transformedData.slice(i * batchSize, (i + 1) * batchSize);
        
        // Use type assertion to satisfy TypeScript
        const { error } = await supabase
          .from(dataType as DataType)
          .insert(batch);

        if (error) throw error;

        setProgress(((i + 1) / totalBatches) * 100);
      }

      toast.success(`Successfully uploaded ${transformedData.length} records!`);
      setFile(null);
      setDataType('');
      setProgress(0);
    } catch (error) {
      console.error('Error uploading data:', error);
      toast.error('Failed to upload data. Please check the file format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Upload className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">File Upload</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Upload Existing Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Type</label>
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
              <label className="text-sm font-medium">File (CSV or JSON)</label>
              <Input
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || !dataType || uploading}
            className="w-full"
          >
            {uploading ? 'Uploading...' : 'Upload Data'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            File Format Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Supported Formats:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>CSV files with headers in the first row</li>
                <li>JSON files with array of objects</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Required Fields by Data Type:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <strong>Orders:</strong> item_name, quantity, rate, total, payment_mode
                </div>
                <div>
                  <strong>Charging Sessions:</strong> total_amount, payment_mode
                </div>
                <div>
                  <strong>Expenses:</strong> description, amount, category, payment_mode
                </div>
                <div>
                  <strong>Deposits:</strong> amount, deposited_by, mode
                </div>
                <div>
                  <strong>Withdrawals:</strong> amount, purpose
                </div>
                <div>
                  <strong>Cooperative Savings:</strong> member_id, contribution_amount, cycle_period
                </div>
                <div>
                  <strong>Menu Items:</strong> name, price, category
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-yellow-800 text-xs">
                <strong>Note:</strong> All uploaded data will be associated with your user account. 
                Date fields will default to today's date if not provided.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUploadTab;
