import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Download,
  RefreshCw,
} from "lucide-react";

// Import existing components
import Analytics from "@/pages/Analytics";
import InsightsTab from "@/components/tabs/InsightsTab";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";

const UnifiedInsightsTab = () => {
  const [activeTab, setActiveTab] = useState("financial-analytics");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl animate-pulse">
              <BarChart3 className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Business Insights
            </h1>
            <TrendingUp className="h-8 w-8 text-purple-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive analytics, insights, and visual dashboards for
            informed business decisions
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger
              value="financial-analytics"
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Financial Analytics
            </TabsTrigger>
            <TabsTrigger
              value="business-insights"
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Business Insights
            </TabsTrigger>
            <TabsTrigger
              value="visual-dashboards"
              className="flex items-center gap-2"
            >
              <PieChart className="h-4 w-4" />
              Visual Dashboards
            </TabsTrigger>
          </TabsList>

          {/* Quick Actions */}
          <div className="flex justify-end gap-4 mb-6">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Tab Contents */}
          <TabsContent value="financial-analytics" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  Financial Analytics Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Embed Analytics component */}
                <Analytics />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business-insights" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-green-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  Business Intelligence & Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Embed InsightsTab component */}
                <div className="p-6">
                  <InsightsTab />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visual-dashboards" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-purple-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <PieChart className="h-6 w-6" />
                  </div>
                  Visual Analytics & Infographics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Embed SuperAdminDashboard component (Infographics) */}
                <div className="p-6">
                  <SuperAdminDashboard />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Active Analytics
                  </p>
                  <p className="text-2xl font-bold text-blue-800">3</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Data Sources
                  </p>
                  <p className="text-2xl font-bold text-green-800">8</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Visual Charts
                  </p>
                  <p className="text-2xl font-bold text-purple-800">12</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                  <PieChart className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">
                    Real-time Updates
                  </p>
                  <p className="text-2xl font-bold text-orange-800">Live</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white">
                  <RefreshCw className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UnifiedInsightsTab;
