// Utility functions to debug and fix PostgREST schema cache issues (PGRST204)

import { supabase } from "@/integrations/supabase/client";

export interface SchemaTestResult {
  table_exists: boolean;
  date_column_exists: boolean;
  order_date_column_exists: boolean;
  test_insert_success: boolean;
  test_insert_error?: string;
  columns: string[];
  status: "SUCCESS" | "ERROR";
  message: string;
}

/**
 * Test the orders table structure and functionality
 */
export async function testOrdersTable(): Promise<SchemaTestResult | null> {
  try {
    const { data, error } = await supabase.rpc("test_orders_table");

    if (error) {
      console.error("Error testing orders table:", error);
      return null;
    }

    return data as SchemaTestResult;
  } catch (error) {
    console.error("Failed to test orders table:", error);
    return null;
  }
}

/**
 * Force refresh the PostgREST schema cache
 */
export async function refreshSchemaCache(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("refresh_postgrest_schema");

    if (error) {
      console.error("Error refreshing schema cache:", error);
      return false;
    }

    console.log("Schema cache refresh result:", data);
    return true;
  } catch (error) {
    console.error("Failed to refresh schema cache:", error);
    return false;
  }
}

/**
 * Comprehensive diagnostic function for PGRST204 errors
 */
export async function diagnosePGRST204Error(): Promise<{
  canConnect: boolean;
  tableTest: SchemaTestResult | null;
  schemaRefreshSuccess: boolean;
  recommendations: string[];
}> {
  const results = {
    canConnect: false,
    tableTest: null as SchemaTestResult | null,
    schemaRefreshSuccess: false,
    recommendations: [] as string[],
  };

  // Test 1: Basic connection
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("count")
      .limit(0);
    results.canConnect = !error;
  } catch (error) {
    console.error("Connection test failed:", error);
  }

  // Test 2: Table structure
  results.tableTest = await testOrdersTable();

  // Test 3: Schema refresh
  results.schemaRefreshSuccess = await refreshSchemaCache();

  // Generate recommendations
  if (!results.canConnect) {
    results.recommendations.push(
      "Cannot connect to Supabase. Check your configuration.",
    );
  }

  if (!results.tableTest) {
    results.recommendations.push(
      "Cannot test table structure. Run the database migrations.",
    );
  } else if (results.tableTest.status === "ERROR") {
    if (!results.tableTest.table_exists) {
      results.recommendations.push(
        "Orders table does not exist. Run migration: 20250201000026_force_fix_orders_schema_cache.sql",
      );
    }
    if (!results.tableTest.date_column_exists) {
      results.recommendations.push(
        'Missing "date" column in orders table. Run the migration to fix schema.',
      );
    }
    if (!results.tableTest.order_date_column_exists) {
      results.recommendations.push(
        'Missing "order_date" column in orders table. Run the migration to fix schema.',
      );
    }
  }

  if (!results.schemaRefreshSuccess) {
    results.recommendations.push(
      "Schema cache refresh failed. Try refreshing the page or contact support.",
    );
  } else {
    results.recommendations.push(
      "Schema cache refreshed successfully. Try your operation again.",
    );
  }

  return results;
}

/**
 * Helper function to display user-friendly error messages for PGRST204
 */
export function getPGRST204ErrorMessage(
  tableName: string,
  columnName: string,
): string {
  return `Database schema error: Cannot find the '${columnName}' column in the '${tableName}' table. This usually means:

1. The database migration hasn't been run yet
2. The schema cache needs to be refreshed
3. The table structure is outdated

Solutions:
• Refresh the page and try again
• Contact your administrator to run the latest database migrations
• If the problem persists, use the diagnostic tools in the developer console`;
}

/**
 * Auto-diagnostic function that can be called when PGRST204 errors occur
 */
export async function autoFixPGRST204(): Promise<{
  success: boolean;
  message: string;
}> {
  console.log("🔧 Auto-diagnosing PGRST204 error...");

  const diagnostic = await diagnosePGRST204Error();

  console.log("📊 Diagnostic Results:", diagnostic);

  if (
    diagnostic.tableTest?.status === "SUCCESS" &&
    diagnostic.schemaRefreshSuccess
  ) {
    return {
      success: true,
      message: "Schema issue resolved! Please try your operation again.",
    };
  }

  return {
    success: false,
    message: `Schema issues detected. Recommendations:\n${diagnostic.recommendations.join("\n")}`,
  };
}
