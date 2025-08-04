
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UserManagementTab from "@/components/tabs/UserManagementTab";
import SummaryReportTab from "@/components/tabs/SummaryReportTab";

const AdminPanel = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage users, view reports, and configure system settings.
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <UserManagementTab />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <SummaryReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
