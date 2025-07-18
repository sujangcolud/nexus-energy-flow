import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const allItems = [
  { id: 'orders', label: 'Orders' },
  { id: 'charging', label: 'Charging' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'deposits', label: 'Deposits' },
  { id: 'withdrawals', label: 'Withdrawals' },
  { id: 'cooperative', label: 'Savings' },
  { id: 'reports', label: 'Reports' },
  { id: 'reports-view', label: 'View Reports' },
  { id: 'insights', label: 'Analytics' },
  { id: 'data-input', label: 'Bulk Data Import' },
  { id: 'super_admin_dashboard', label: 'Admin Dashboard' },
  { id: 'menu', label: 'Menu Management' },
  { id: 'user_management', label: 'Management' },
];

const Settings = () => {
  const [tabSettings, setTabSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const storedSettings = localStorage.getItem('tabSettings');
    if (storedSettings) {
      setTabSettings(JSON.parse(storedSettings));
    } else {
      const defaultSettings = allItems.reduce((acc, item) => {
        acc[item.id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setTabSettings(defaultSettings);
    }
  }, []);

  const handleToggle = (tabId: string) => {
    const newSettings = { ...tabSettings, [tabId]: !tabSettings[tabId] };
    setTabSettings(newSettings);
    localStorage.setItem('tabSettings', JSON.stringify(newSettings));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tab Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <Label htmlFor={item.id}>{item.label}</Label>
              <Switch
                id={item.id}
                checked={tabSettings[item.id] ?? true}
                onCheckedChange={() => handleToggle(item.id)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Settings;
