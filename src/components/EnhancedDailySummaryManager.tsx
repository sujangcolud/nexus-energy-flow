import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
  Settings,
  Play,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { dailySummaryManager } from "@/utils/enhancedDailySummaryManager";

interface SystemStatus {
  isReady: boolean;
  totalSummaries: number;
  latestSummaryDate: string | null;
  oldestSummaryDate: string | null;
}

const EnhancedDailySummaryManager: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    isReady: false,
    totalSummaries: 0,
    latestSummaryDate: null,
    oldestSummaryDate: null,
  });
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      const status = await dailySummaryManager.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error("Error checking system status:", error);
      toast.error("Failed to check system status");
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeSystem = async () => {
    setInitializing(true);
    try {
      const success = await dailySummaryManager.initializeSystem();
      if (success) {
        await checkSystemStatus();
      }
    } catch (error) {
      console.error("Error initializing system:", error);
      toast.error("Failed to initialize system");
    } finally {
      setInitializing(false);
    }
  };

  const handlePopulateHistoricalData = async () => {
    setRefreshing(true);
    try {
      const success = await dailySummaryManager.populateHistoricalData();
      if (success) {
        await checkSystemStatus();
      }
    } catch (error) {
      console.error("Error populating historical data:", error);
      toast.error("Failed to populate historical data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshToday = async () => {
    const today = new Date().toISOString().split("T")[0];
    const success = await dailySummaryManager.refreshDateSummary(today);
    if (success) {
      await checkSystemStatus();
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Enhanced Daily Summary System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {systemStatus.isReady ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <Badge
                variant={systemStatus.isReady ? "default" : "destructive"}
                className={
                  systemStatus.isReady
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {systemStatus.isReady ? "System Ready" : "System Not Ready"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkSystemStatus}
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
          </div>

          {/* System Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Total Summaries
                </span>
              </div>
              <div className="text-lg font-bold text-blue-900">
                {systemStatus.totalSummaries}
              </div>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Latest Summary
                </span>
              </div>
              <div className="text-sm font-semibold text-green-900">
                {formatDate(systemStatus.latestSummaryDate)}
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  Oldest Summary
                </span>
              </div>
              <div className="text-sm font-semibold text-purple-900">
                {formatDate(systemStatus.oldestSummaryDate)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!systemStatus.isReady && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={initializing}
                  >
                    {initializing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                        Initializing System...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Initialize Enhanced System
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Initialize Enhanced Daily Summary System</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will set up the enhanced daily summary system with detailed payment mode breakdowns.
                      The system will automatically populate data from your existing transactions.
                      This process may take a few moments.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleInitializeSystem}>
                      Initialize System
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {systemStatus.isReady && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={refreshing}
                      className="flex items-center gap-2"
                    >
                      {refreshing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                          Populating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Populate Historical Data
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Populate Historical Data</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will re-calculate and update all daily summaries from your existing transaction data.
                        This is useful if you've made changes to past transactions or want to ensure all data is up-to-date.
                        This process may take a few moments depending on your data volume.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePopulateHistoricalData}>
                        Populate Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button
                  variant="outline"
                  onClick={handleRefreshToday}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Refresh Today's Summary
                </Button>
              </div>
            )}
          </div>

          {/* Information */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Information
            </h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>• The enhanced daily summary system automatically tracks detailed payment mode breakdowns</p>
              <p>• Data is updated in real-time when you add, edit, or delete transactions</p>
              <p>• Historical data can be populated from existing transactions at any time</p>
              <p>• All calculations follow your specified business logic for accurate financial reporting</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedDailySummaryManager;
