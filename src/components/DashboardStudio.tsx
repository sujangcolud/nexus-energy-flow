
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Calculator,
  BarChart3,
  Settings,
  Code,
  Play,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";

interface Dashboard {
  id: string;
  name: string;
  description: string;
  calculation_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DashboardStudio: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form states
  const [newDashboardName, setNewDashboardName] = useState("");
  const [newDashboardDescription, setNewDashboardDescription] = useState("");
  const [calculationConfig, setCalculationConfig] = useState("{}");

  useEffect(() => {
    checkDashboardStudioSupport();
  }, []);

  const checkDashboardStudioSupport = async () => {
    setLoading(true);
    try {
      // Since custom_calculations table doesn't exist, we'll use localStorage for now
      const storedDashboards = localStorage.getItem('custom_dashboards');
      if (storedDashboards) {
        setDashboards(JSON.parse(storedDashboards));
      }
      
      toast.info("Dashboard Studio is running in local mode. Custom calculations table is not available.");
    } catch (error) {
      logError("checking dashboard studio support", error);
      toast.error("Dashboard Studio is not available in this environment");
    } finally {
      setLoading(false);
    }
  };

  const saveDashboard = async () => {
    if (!newDashboardName.trim()) {
      toast.error("Please enter a dashboard name");
      return;
    }

    try {
      let config;
      try {
        config = JSON.parse(calculationConfig);
      } catch {
        toast.error("Invalid JSON configuration");
        return;
      }

      const newDashboard: Dashboard = {
        id: crypto.randomUUID(),
        name: newDashboardName.trim(),
        description: newDashboardDescription.trim(),
        calculation_config: config,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedDashboards = [...dashboards, newDashboard];
      setDashboards(updatedDashboards);
      localStorage.setItem('custom_dashboards', JSON.stringify(updatedDashboards));

      toast.success("Dashboard created successfully!");
      resetForm();
      setShowCreateDialog(false);
    } catch (error) {
      logError("creating dashboard", error);
      toast.error(`Error creating dashboard: ${extractErrorMessage(error)}`);
    }
  };

  const updateDashboard = async (dashboard: Dashboard) => {
    try {
      const updatedDashboards = dashboards.map(d => 
        d.id === dashboard.id 
          ? { ...dashboard, updated_at: new Date().toISOString() }
          : d
      );
      
      setDashboards(updatedDashboards);
      localStorage.setItem('custom_dashboards', JSON.stringify(updatedDashboards));

      toast.success("Dashboard updated successfully!");
      setEditingDashboard(null);
    } catch (error) {
      logError("updating dashboard", error);
      toast.error(`Error updating dashboard: ${extractErrorMessage(error)}`);
    }
  };

  const deleteDashboard = async (dashboard: Dashboard) => {
    if (!confirm(`Are you sure you want to delete "${dashboard.name}"?`)) {
      return;
    }

    try {
      const updatedDashboards = dashboards.filter(d => d.id !== dashboard.id);
      setDashboards(updatedDashboards);
      localStorage.setItem('custom_dashboards', JSON.stringify(updatedDashboards));

      toast.success("Dashboard deleted successfully!");
    } catch (error) {
      logError("deleting dashboard", error);
      toast.error(`Error deleting dashboard: ${extractErrorMessage(error)}`);
    }
  };

  const resetForm = () => {
    setNewDashboardName("");
    setNewDashboardDescription("");
    setCalculationConfig("{}");
  };

  const sampleCalculationConfig = {
    title: "Custom Financial Summary",
    calculations: [
      {
        name: "Total Revenue",
        formula: "orders.total + charging_sessions.total_amount",
        type: "sum"
      },
      {
        name: "Net Profit",
        formula: "revenue - expenses.amount",
        type: "calculation"
      }
    ],
    charts: [
      {
        type: "bar",
        title: "Monthly Revenue",
        data_source: "orders",
        group_by: "month"
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Studio</h1>
          <p className="text-gray-600 mt-2">
            Create and manage custom financial dashboards with advanced calculations
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Dashboard
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dashboards">My Dashboards</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Calculator className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{dashboards.length}</p>
                    <p className="text-sm text-gray-600">Custom Dashboards</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{dashboards.filter(d => d.is_active).length}</p>
                    <p className="text-sm text-gray-600">Active Dashboards</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Settings className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">Local Mode</p>
                    <p className="text-sm text-gray-600">Storage Mode</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Dashboard Studio allows you to create custom financial dashboards with advanced calculations.
                  Currently running in local mode - your dashboards will be saved to browser storage.
                </p>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Features:</h4>
                  <ul className="list-disc list-inside text-blue-800 space-y-1">
                    <li>Create custom calculation formulas</li>
                    <li>Build interactive charts and visualizations</li>
                    <li>Save and manage multiple dashboards</li>
                    <li>Real-time data integration</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Dashboards</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading dashboards...</p>
                </div>
              ) : dashboards.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No custom dashboards found. Create your first dashboard to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboards.map((dashboard) => (
                      <TableRow key={dashboard.id}>
                        <TableCell>
                          {editingDashboard?.id === dashboard.id ? (
                            <Input
                              value={editingDashboard.name}
                              onChange={(e) =>
                                setEditingDashboard({
                                  ...editingDashboard,
                                  name: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <div className="font-medium">{dashboard.name}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingDashboard?.id === dashboard.id ? (
                            <Textarea
                              value={editingDashboard.description}
                              onChange={(e) =>
                                setEditingDashboard({
                                  ...editingDashboard,
                                  description: e.target.value,
                                })
                              }
                              rows={2}
                            />
                          ) : (
                            <div className="text-sm text-gray-600">
                              {dashboard.description || "No description"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={dashboard.is_active ? "default" : "secondary"}>
                            {dashboard.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(dashboard.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(dashboard.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingDashboard?.id === dashboard.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateDashboard(editingDashboard)}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingDashboard(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingDashboard(dashboard)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteDashboard(dashboard)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Financial Overview</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Complete financial summary with income, expenses, and profit calculations.
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setNewDashboardName("Financial Overview");
                      setNewDashboardDescription("Complete financial summary dashboard");
                      setCalculationConfig(JSON.stringify(sampleCalculationConfig, null, 2));
                      setShowCreateDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Payment Mode Analysis</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Detailed breakdown of transactions by payment modes (Cash, eSewa, Fonepay).
                  </p>
                  <Button size="sm" disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Coming Soon
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dashboard Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Custom Dashboard</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Dashboard Name</label>
              <Input
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="Enter dashboard name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={newDashboardDescription}
                onChange={(e) => setNewDashboardDescription(e.target.value)}
                placeholder="Enter dashboard description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Calculation Configuration (JSON)</label>
              <Textarea
                value={calculationConfig}
                onChange={(e) => setCalculationConfig(e.target.value)}
                placeholder="Enter JSON configuration"
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600">
                Note: Dashboard Studio is currently running in local mode. 
                Your configurations will be saved to browser storage.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveDashboard}>
              <Save className="h-4 w-4 mr-2" />
              Create Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardStudio;
