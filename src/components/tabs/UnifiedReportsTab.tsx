import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Settings,
  PlusCircle,
  Download,
  Filter,
  Calendar,
} from "lucide-react";

// Import existing components
import ReportsViewTab from "@/components/tabs/ReportsViewTab";
import AdminPanel from "@/pages/AdminPanel";
import CustomReportCreator from "@/pages/CustomReportCreator";

const UnifiedReportsTab = () => {
  const [activeTab, setActiveTab] = useState("view-reports");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-slate-400/20 to-gray-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-gray-400/20 to-zinc-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-xl animate-pulse">
              <FileText className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 via-gray-700 to-zinc-700 bg-clip-text text-transparent">
              Reports Center
            </h1>
            <Settings className="h-8 w-8 text-gray-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Generate, view, and manage comprehensive business reports with
            advanced administrative controls
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger
              value="view-reports"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Reports
            </TabsTrigger>
            <TabsTrigger
              value="admin-panel"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Admin Panel
            </TabsTrigger>
            <TabsTrigger
              value="custom-reports"
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Custom Reports
            </TabsTrigger>
          </TabsList>

          {/* Quick Actions */}
          <div className="flex justify-end gap-4 mb-6">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter Reports
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>

          {/* Tab Contents */}
          <TabsContent value="view-reports" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-slate-600 to-gray-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileText className="h-6 w-6" />
                  </div>
                  Generated Reports & Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Embed ReportsViewTab component */}
                <div className="p-6">
                  <ReportsViewTab />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin-panel" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-gray-600 to-slate-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Settings className="h-6 w-6" />
                  </div>
                  Administrative Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Embed AdminPanel component */}
                <div className="p-6">
                  <AdminPanel />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom-reports" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-zinc-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-zinc-600 to-slate-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <PlusCircle className="h-6 w-6" />
                  </div>
                  Custom Report Builder
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Embed CustomReportCreator component */}
                <div className="p-6">
                  <CustomReportCreator />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reports Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <FileText className="h-5 w-5" />
                Available Report Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700">
                  Financial Reports:
                </h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Daily sales summaries</li>
                  <li>• Monthly revenue analysis</li>
                  <li>• Expense breakdowns</li>
                  <li>• Profit & loss statements</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700">
                  Operational Reports:
                </h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Charging session analytics</li>
                  <li>• Inventory status reports</li>
                  <li>• VAT compliance reports</li>
                  <li>• Customer activity reports</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Settings className="h-5 w-5" />
                Admin Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-purple-700">
                  User Management:
                </h4>
                <ul className="text-sm text-purple-600 space-y-1">
                  <li>• Role-based access control</li>
                  <li>• Permission management</li>
                  <li>• Activity monitoring</li>
                  <li>• Audit trail logging</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-purple-700">
                  System Controls:
                </h4>
                <ul className="text-sm text-purple-600 space-y-1">
                  <li>• Database maintenance</li>
                  <li>• Backup & recovery</li>
                  <li>• Performance monitoring</li>
                  <li>• Security settings</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">
                    Total Reports
                  </p>
                  <p className="text-2xl font-bold text-slate-800">0</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-slate-500 to-gray-600 rounded-xl text-white">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Custom Reports
                  </p>
                  <p className="text-2xl font-bold text-blue-800">0</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white">
                  <PlusCircle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Report Status
                  </p>
                  <p className="text-2xl font-bold text-green-800">Active</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <Settings className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">
                    Last Export
                  </p>
                  <p className="text-2xl font-bold text-orange-800">Never</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white">
                  <Download className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UnifiedReportsTab;
