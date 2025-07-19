import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  Database,
  Download,
  Settings,
  Cloud,
} from "lucide-react";

// Import existing components
import DataInputTab from "@/components/tabs/DataInputTab";
import FileUploadTab from "@/components/tabs/FileUploadTab";

const UnifiedBulkImportTab = () => {
  const [activeTab, setActiveTab] = useState("data-import");

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-teal-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl animate-pulse">
              <Upload className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Bulk Import Center
            </h1>
            <Database className="h-8 w-8 text-emerald-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Import data in bulk, upload files, and manage large datasets
            efficiently
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger
              value="data-import"
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Data Import
            </TabsTrigger>
            <TabsTrigger
              value="file-upload"
              className="flex items-center gap-2"
            >
              <Cloud className="h-4 w-4" />
              File Upload
            </TabsTrigger>
          </TabsList>

          {/* Quick Actions */}
          <div className="flex justify-end gap-4 mb-6">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Import Settings
            </Button>
          </div>

          {/* Tab Contents */}
          <TabsContent value="data-import" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-green-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Database className="h-6 w-6" />
                  </div>
                  Bulk Data Import
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Embed DataInputTab component */}
                <div className="p-6">
                  <DataInputTab />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="file-upload" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-emerald-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Cloud className="h-6 w-6" />
                  </div>
                  File Upload & Management
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Embed FileUploadTab component */}
                <div className="p-6">
                  <FileUploadTab />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Import Guidelines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <FileText className="h-5 w-5" />
                Data Import Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700">
                  Supported Formats:
                </h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• CSV files (comma-separated)</li>
                  <li>• Excel files (.xlsx, .xls)</li>
                  <li>• JSON format</li>
                  <li>• Tab-delimited text files</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700">Data Types:</h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Orders & Sales data</li>
                  <li>• Charging session records</li>
                  <li>• Expense transactions</li>
                  <li>• Customer information</li>
                  <li>• Inventory items</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Upload className="h-5 w-5" />
                File Upload Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-green-700">Upload Options:</h4>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>• Drag & drop interface</li>
                  <li>• Multiple file selection</li>
                  <li>• Progress tracking</li>
                  <li>• Error validation</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-green-700">File Management:</h4>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>• Cloud storage integration</li>
                  <li>• File history tracking</li>
                  <li>• Backup & recovery</li>
                  <li>• Security & permissions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Files Uploaded
                  </p>
                  <p className="text-2xl font-bold text-green-800">0</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <Upload className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Records Imported
                  </p>
                  <p className="text-2xl font-bold text-blue-800">0</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white">
                  <Database className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Processing
                  </p>
                  <p className="text-2xl font-bold text-purple-800">Ready</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
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
                    Success Rate
                  </p>
                  <p className="text-2xl font-bold text-orange-800">100%</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UnifiedBulkImportTab;
