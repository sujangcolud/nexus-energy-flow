import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "./errorHandling";

export const ensureCustomCalculationsTable = async (): Promise<boolean> => {
  try {
    // First, try a simple query to check if table exists
    const { error: testError } = await supabase
      .from("custom_calculations")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (!testError) {
      console.log("✅ custom_calculations table is accessible");
      return true;
    }

    console.warn("⚠️ custom_calculations table not accessible:", testError);

    // If the table doesn't exist, try to create it
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.custom_calculations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        name text NOT NULL,
        description text,
        calculation_config jsonb NOT NULL DEFAULT '[]'::jsonb,
        result_cache jsonb,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- Enable RLS
      ALTER TABLE public.custom_calculations ENABLE ROW LEVEL SECURITY;

      -- Create policies
      DROP POLICY IF EXISTS "Users can manage own custom calculations" ON public.custom_calculations;
      CREATE POLICY "Users can manage own custom calculations" ON public.custom_calculations
        FOR ALL USING (auth.uid() = user_id);

      -- Create index
      CREATE INDEX IF NOT EXISTS idx_custom_calculations_user_active 
        ON public.custom_calculations(user_id, is_active);

      -- Grant permissions
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_calculations TO authenticated;
    `;

    const { error: createError } = await supabase.rpc("execute_custom_sql", {
      sql: createTableSQL,
    });

    if (createError) {
      console.error(
        "❌ Failed to create custom_calculations table:",
        createError,
      );
      return false;
    }

    console.log("✅ custom_calculations table created successfully");
    return true;
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    console.error("❌ Error ensuring custom_calculations table:", errorMessage);
    return false;
  }
};

export const isDashboardStudioSupported = async (): Promise<boolean> => {
  const tableExists = await ensureCustomCalculationsTable();
  return tableExists;
};
