import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import ReportsTab from "@/components/tabs/ReportsTab";
import SummaryReportTab from "../components/tabs/SummaryReportTab";

const AdminPanel = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="summary-report">Summary Report</TabsTrigger>
        </TabsList>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="summary-report">
          <SummaryReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
