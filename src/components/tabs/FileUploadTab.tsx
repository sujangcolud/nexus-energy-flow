
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

type DataType = 'orders' | 'charging_sessions' | 'expenses' | 'deposits' | 'withdrawals' | 'cooperative_savings' | 'menu_items';

const FileUploadTab = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dataType, setDataType] = useState<DataType | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
      const validTypes = ['text/csv', 'application/json', '.csv', '.json'];
      const fileExtension = selectedFile.name.toLowerCase().split('.').pop();
      
      if (selectedFile.type === 'text/csv' || selectedFile.type === 'application/json' || 
          fileExtension === 'csv' || fileExtension === 'json') {
        setFile(selectedFile);
        setUploadStatus('idle');
        console.log('File selected:', selectedFile.name, 'Type:', selectedFile.type);
      } else {
        toast.error('Please select a valid CSV or JSON file');
        event.target.value = '';
        setFile(null);
      }
    }
  };

  const parseCSV = (csvText: string): any[] => {
    console.log('Parsing CSV data...');
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }
    
    console.log('CSV parsed successfully:', data.length, 'records');
    return data;
  };

  const validateData = (data: any[], type: string): boolean => {
    console.log('Validating data for type:', type);
    if (!data || data.length === 0) {
      console.error('No data to validate');
      return false;
    }

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
    if (!required) {
      console.error('Unknown data type:', type);
      return false;
    }

    const missingFields: string[] = [];
    const isValid = data.every((row, index) => {
      const rowMissingFields = required.filter(field => !row.hasOwnProperty(field) || row[field] === '');
      if (rowMissingFields.length > 0) {
        missingFields.push(`Row ${index + 1}: ${rowMissingFields.join(', ')}`);
        return false;
      }
      return true;
    });

    if (!isValid) {
      console.error('Validation failed. Missing fields:', missingFields);
      toast.error(`Validation failed. Missing required fields in some rows. Check console for details.`);
    } else {
      console.log('Data validation successful');
    }

    return isValid;
  };

  const transformData = (data: any[], type: string) => {
    console.log('Transforming data for type:', type);
    return data.map((row, index) => {
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
          if (!transformed.order_date) transformed.order_date = new Date().toISOString().split('T')[0];
          break;
        case 'charging_sessions':
          transformed.total_amount = parseFloat(transformed.total_amount) || 0;
          if (transformed.start_percentage) transformed.start_percentage = parseFloat(transformed.start_percentage);
          if (transformed.end_percentage) transformed.end_percentage = parseFloat(transformed.end_percentage);
          if (transformed.kcal) transformed.kcal = parseFloat(transformed.kcal);
          if (transformed.per_unit_rate) transformed.per_unit_rate = parseFloat(transformed.per_unit_rate);
          if (transformed.per_percent_rate) transformed.per_percent_rate = parseFloat(transformed.per_percent_rate);
          if (!transformed.session_date) transformed.session_date = new Date().toISOString().split('T')[0];
          break;
        case 'expenses':
          transformed.amount = parseFloat(transformed.amount) || 0;
          if (!transformed.expense_date) transformed.expense_date = new Date().toISOString().split('T')[0];
          break;
        case 'deposits':
          transformed.amount = parseFloat(transformed.amount) || 0;
          if (!transformed.deposit_date) transformed.deposit_date = new Date().toISOString().split('T')[0];
          break;
        case 'withdrawals':
          transformed.amount = parseFloat(transformed.amount) || 0;
          if (!transformed.withdrawal_date) transformed.withdrawal_date = new Date().toISOString().split('T')[0];
          break;
        case 'cooperative_savings':
          transformed.contribution_amount = parseFloat(transformed.contribution_amount) || 0;
          if (!transformed.contribution_date) transformed.contribution_date = new Date().toISOString().split('T')[0];
          break;
        case 'menu_items':
          transformed.price = parseFloat(transformed.price) || 0;
          transformed.is_available = transformed.is_available !== 'false';
          break;
      }

      console.log(`Transformed row ${index + 1}:`, transformed);
      return transformed;
    });
  };

  const handleUpload = async () => {
    if (!file || !dataType || !user) {
      toast.error('Please select a file and data type');
      return;
    }

    console.log('Starting upload process...', { fileName: file.name, dataType, userId: user.id });
    setUploading(true);
    setProgress(0);
    setUploadStatus('idle');

    try {
      const fileText = await file.text();
      console.log('File read successfully, length:', fileText.length);
      
      let data: any[];

      if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
        console.log('Parsing as JSON...');
        data = JSON.parse(fileText);
        if (!Array.isArray(data)) {
          throw new Error('JSON file must contain an array of objects');
        }
      } else {
        console.log('Parsing as CSV...');
        data = parseCSV(fileText);
      }

      console.log('Parsed data:', data.length, 'records');

      if (!validateData(data, dataType)) {
        setUploadStatus('error');
        return;
      }

      const transformedData = transformData(data, dataType);
      console.log('Data transformed successfully');

      const batchSize = 50; // Reduced batch size for better reliability
      const totalBatches = Math.ceil(transformedData.length / batchSize);
      console.log('Will process in', totalBatches, 'batches of', batchSize, 'records each');

      for (let i = 0; i < totalBatches; i++) {
        const batch = transformedData.slice(i * batchSize, (i + 1) * batchSize);
        console.log(`Processing batch ${i + 1}/${totalBatches}, records:`, batch.length);
        
        const { error } = await supabase
          .from(dataType as DataType)
          .insert(batch);

        if (error) {
          console.error('Batch insert error:', error);
          throw error;
        }

        const progressPercent = ((i + 1) / totalBatches) * 100;
        setProgress(progressPercent);
        console.log(`Batch ${i + 1} completed, progress: ${progressPercent.toFixed(1)}%`);
      }

      console.log('All batches processed successfully');
      toast.success(`Successfully uploaded ${transformedData.length} records!`);
      setUploadStatus('success');
      setFile(null);
      setDataType('');
      setProgress(0);
    } catch (error) {
      console.error('Error uploading data:', error);
      setUploadStatus('error');
      if (error instanceof Error) {
        toast.error(`Failed to upload data: ${error.message}`);
      } else {
        toast.error('Failed to upload data. Please check the file format and try again.');
      }
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
              <label className="text-sm font-medium">File (CSV or JSON) *</label>
              <Input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
          </div>

          {file && (
            <div className="p-3 bg-blue-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Selected file: {file.name}</span>
                <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading data...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Upload completed successfully!</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Upload failed. Please check the file format and try again.</span>
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

      {/* Format Guidelines */}
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
                <div className="space-y-1">
                  <div><strong>Orders:</strong> item_name, quantity, rate, total, payment_mode</div>
                  <div><strong>Charging Sessions:</strong> total_amount, payment_mode</div>
                  <div><strong>Expenses:</strong> description, amount, category, payment_mode</div>
                  <div><strong>Deposits:</strong> amount, deposited_by, mode</div>
                </div>
                <div className="space-y-1">
                  <div><strong>Withdrawals:</strong> amount, purpose</div>
                  <div><strong>Cooperative Savings:</strong> member_id, contribution_amount, cycle_period</div>
                  <div><strong>Menu Items:</strong> name, price, category</div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-yellow-800 text-xs">
                <strong>Note:</strong> All uploaded data will be associated with your user account. 
                Date fields will default to today's date if not provided. Ensure your data follows the exact field names shown above.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUploadTab;
