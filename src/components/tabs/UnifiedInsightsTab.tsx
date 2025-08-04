
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/utils/errorHandling";
import EnhancedInsightsTab from "./EnhancedInsightsTab";

const UnifiedInsightsTab: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize the component
    setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Unified Business Insights</h2>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          All-in-One Analytics
        </Badge>
      </div>

      <Tabs defaultValue="enhanced" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="enhanced">Enhanced Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced" className="space-y-6">
          <EnhancedInsightsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedInsightsTab;
