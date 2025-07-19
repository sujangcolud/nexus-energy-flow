import { supabase } from "@/integrations/supabase/client";
import { logError } from "./errorHandling";

export interface SchemaValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

/**
 * Validates the VAT entries table schema and provides recommendations
 */
export async function validateVATTableSchema(): Promise<SchemaValidationResult> {
  const result: SchemaValidationResult = {
    isValid: true,
    issues: [],
    recommendations: [],
  };

  try {
    // Test basic table access
    const { data, error } = await supabase
      .from("vat_entries")
      .select("count")
      .limit(1);

    if (error) {
      result.isValid = false;

      if (error.code === "PGRST204") {
        if (error.message.includes("entry_id")) {
          result.issues.push("entry_id column not found in vat_entries table");
          result.recommendations.push(
            "Run database migration to add entry_id column as TEXT type",
          );
        } else {
          result.issues.push(`Schema cache error: ${error.message}`);
          result.recommendations.push(
            "Refresh PostgREST schema cache or restart database connection",
          );
        }
      } else if (error.code === "42P01") {
        result.issues.push("vat_entries table does not exist");
        result.recommendations.push(
          "Run database migration to create vat_entries table",
        );
      } else {
        result.issues.push(`Database error: ${error.message} (${error.code})`);
        result.recommendations.push(
          "Check database connectivity and permissions",
        );
      }
    }

    // Test specific column access if table exists
    if (result.isValid) {
      try {
        const { error: columnError } = await supabase
          .from("vat_entries")
          .select("entry_id, entry_type, item_name, amount")
          .limit(0);

        if (columnError) {
          result.isValid = false;
          result.issues.push(`Column access error: ${columnError.message}`);
          result.recommendations.push(
            "Verify all required columns exist with correct data types",
          );
        }
      } catch (columnError) {
        result.isValid = false;
        result.issues.push("Failed to validate column structure");
        result.recommendations.push(
          "Check table schema and column definitions",
        );
      }
    }
  } catch (error) {
    logError("VAT table schema validation", error);
    result.isValid = false;
    result.issues.push("Failed to connect to database or validate schema");
    result.recommendations.push(
      "Check network connectivity and database availability",
    );
  }

  return result;
}

/**
 * Attempts to fix common VAT table schema issues
 */
export async function attemptVATTableFix(): Promise<boolean> {
  try {
    // This would typically run a database migration or schema update
    // For now, just return false as we can't run SQL directly from the client
    console.warn("VAT table schema fix should be run on the database server");
    return false;
  } catch (error) {
    logError("VAT table schema fix attempt", error);
    return false;
  }
}

/**
 * Gets a user-friendly description of VAT table issues
 */
export function getVATSchemaIssueDescription(error: any): string {
  if (!error) return "Unknown VAT table error";

  const message = error.message || "";
  const code = error.code || "";

  if (code === "PGRST204") {
    if (message.includes("entry_id")) {
      return "The VAT entries table is missing the 'entry_id' column or it has an incorrect data type. This usually happens when the database schema is outdated.";
    }
    return `Database schema cache error: ${message}. The table structure may be outdated.`;
  }

  if (code === "42P01") {
    return "The VAT entries table does not exist in the database. It needs to be created through a database migration.";
  }

  if (message.includes("schema cache")) {
    return "The database schema cache is outdated and needs to be refreshed.";
  }

  return `Database error (${code}): ${message}`;
}
