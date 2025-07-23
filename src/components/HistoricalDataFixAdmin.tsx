// Historical Data Fix Admin Component
// This component allows admins to fix historical calculation issues

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  Wrench,
  Eye,
  Play,
  RefreshCw 
} from "lucide-react";
import { toast } from "sonner";
import {
  fixHistoricalDailySummaries,
  identifyDatesNeedingFix,
  previewHistoricalFix,
  type HistoricalFixResult
} from "@/utils/historicalDataFix";
import {
  quickSchemaTest
} from "@/utils/formValidation";

interface HistoricalDataFixAdminProps {
  className?: string;
}

const HistoricalDataFixAdmin: React.FC<HistoricalDataFixAdminProps> = ({ className }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewDate, setPreviewDate] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<{ datesNeedingFix: string[]; totalDates: number } | null>(null);
  const [fixResult, setFixResult] = useState<HistoricalFixResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [schemaValid, setSchemaValid] = useState<{ success: boolean; issues: string[] } | null>(null);

  const handleSchemaValidation = async () => {
    setAnalyzing(true);
    try {
      const result = await quickSchemaTest();
      setSchemaValid(result);

      if (result.success) {
        toast.success("All database schemas are valid!");
      } else {
        toast.warning(`Found ${result.issues.length} schema issues`);
      }
    } catch (error) {
      toast.error(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!user) return;

    setAnalyzing(true);
    try {
      const result = await identifyDatesNeedingFix(user.id);
      setAnalysisResult(result);

      if (result.datesNeedingFix.length > 0) {
        toast.info(`Found ${result.datesNeedingFix.length} dates needing fixes`);
      } else {
        toast.success("No dates need fixing!");
      }
    } catch (error) {
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePreview = async () => {
    if (!user || !previewDate) return;

    setLoading(true);
    try {
      const preview = await previewHistoricalFix(user.id, previewDate);
      setPreviewData(preview);
      
      if (preview.differences.length > 0) {
        toast.info(`Found ${preview.differences.length} differences for ${previewDate}`);
      } else {
        toast.success(`No changes needed for ${previewDate}`);
      }
    } catch (error) {
      toast.error(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async () => {
    if (!user) return;

    setLoading(true);
    setProgress(0);
    
    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await fixHistoricalDailySummaries(user.id);
      
      clearInterval(progressInterval);
      setProgress(100);
      setFixResult(result);

      if (result.success) {
        toast.success(`Successfully fixed ${result.updatedDates.length} dates!`);
      } else {
        toast.error(`Fix completed with ${result.errors.length} errors`);
      }
    } catch (error) {
      toast.error(`Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="border-2 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Database className="h-5 w-5" />
            Historical Data Fix Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Analysis Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">1. Analyze Historical Data</h3>
              <Button 
                onClick={handleAnalyze} 
                disabled={analyzing}
                variant="outline"
                size="sm"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>

            {analysisResult && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Found <strong>{analysisResult.datesNeedingFix.length}</strong> dates needing fixes 
                  out of <strong>{analysisResult.totalDates}</strong> total dates.
                  {analysisResult.datesNeedingFix.length > 0 && (
                    <div className="mt-2">
                      <strong>Dates needing fixes:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysisResult.datesNeedingFix.slice(0, 10).map(date => (
                          <Badge key={date} variant="outline" className="text-xs">
                            {date}
                          </Badge>
                        ))}
                        {analysisResult.datesNeedingFix.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{analysisResult.datesNeedingFix.length - 10} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">2. Preview Changes (Optional)</h3>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={previewDate}
                onChange={(e) => setPreviewDate(e.target.value)}
                className="border rounded px-3 py-2"
                max="2025-07-18"
                min="2025-05-01"
              />
              <Button 
                onClick={handlePreview} 
                disabled={loading || !previewDate}
                variant="outline"
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>

            {previewData && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-700">
                    Preview for {previewDate}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {previewData.differences.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-700">Changes to be made:</p>
                      {previewData.differences.map((diff: string, index: number) => (
                        <div key={index} className="text-xs font-mono bg-white p-2 rounded border">
                          {diff}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-green-600">No changes needed for this date.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Fix Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">3. Apply Fix</h3>
            
            {progress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Fixing historical data...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                This will fix payment mode breakdowns for dates before July 19, 2025. 
                The operation is safe and only updates missing data.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleFix} 
              disabled={loading || !analysisResult || analysisResult.datesNeedingFix.length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fixing Data...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Fix Historical Data
                </>
              )}
            </Button>
          </div>

          {/* Results Section */}
          {fixResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">4. Results</h3>
              <Alert className={fixResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {fixResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className={fixResult.success ? "text-green-800" : "text-red-800"}>
                    <p className="font-medium">
                      {fixResult.success ? "Fix completed successfully!" : "Fix completed with errors"}
                    </p>
                    <div className="mt-2 space-y-1">
                      <p>Updated dates: {fixResult.updatedDates.length}</p>
                      {fixResult.errors.length > 0 && (
                        <p>Errors: {fixResult.errors.length}</p>
                      )}
                    </div>
                    
                    {fixResult.updatedDates.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Successfully updated:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {fixResult.updatedDates.slice(0, 10).map(date => (
                            <Badge key={date} variant="default" className="text-xs bg-green-100 text-green-800">
                              {date}
                            </Badge>
                          ))}
                          {fixResult.updatedDates.length > 10 && (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                              +{fixResult.updatedDates.length - 10} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {fixResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Errors:</p>
                        <div className="text-xs space-y-1 mt-1">
                          {fixResult.errors.slice(0, 5).map((error, index) => (
                            <div key={index} className="bg-white p-1 rounded border">
                              {error}
                            </div>
                          ))}
                          {fixResult.errors.length > 5 && (
                            <div className="text-xs">... and {fixResult.errors.length - 5} more errors</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalDataFixAdmin;
