import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Database, Download, Settings, Cloud } from "lucide-react";
import DataInputTab from "@/components/tabs/DataInputTab";
import FileUploadTab from "@/components/tabs/FileUploadTab";

const UnifiedBulkImportTab = () => {
  const [activeTab, setActiveTab] = useState("data-import");

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Bulk Import</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="data-import" className="flex items-center gap-2">
              <Database className="h-4 w-4" />Data Import
            </TabsTrigger>
            <TabsTrigger value="file-upload" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />File Upload
            </TabsTrigger>
          </TabsList>

          <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Template</Button>
            <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-2" />Settings</Button>
          </div>

          <TabsContent value="data-import">
            <Card className="bg-card border">
              <CardHeader className="pb-3"><CardTitle className="text-base">Bulk Data Import</CardTitle></CardHeader>
              <CardContent><DataInputTab /></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="file-upload">
            <Card className="bg-card border">
              <CardHeader className="pb-3"><CardTitle className="text-base">File Upload</CardTitle></CardHeader>
              <CardContent><FileUploadTab /></CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Supported Formats</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• CSV files</li>
                <li>• Excel (.xlsx, .xls)</li>
                <li>• JSON format</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-card border">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Data Types</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Orders & Sales</li>
                <li>• Expenses</li>
                <li>• Inventory</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UnifiedBulkImportTab;
