import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "./errorHandling";

export const checkCustomCalculationsAccess = async (): Promise<{
  accessible: boolean;
  error?: string;
}> => {
  try {
    // Try a simple query to check if table exists and is accessible
    const { error } = await supabase
      .from("custom_calculations")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (!error) {
      console.log("✅ custom_calculations table is accessible");
      return { accessible: true };
    }

    const errorMessage = extractErrorMessage(error);
    console.warn("⚠️ custom_calculations table not accessible:", errorMessage);

    return {
      accessible: false,
      error: errorMessage,
    };
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    console.error("❌ Error checking custom_calculations table:", errorMessage);
    return {
      accessible: false,
      error: errorMessage,
    };
  }
};

export const isDashboardStudioSupported = async (): Promise<boolean> => {
  const { accessible } = await checkCustomCalculationsAccess();
  return accessible;
};

// Dashboard storage utilities for localStorage fallback
export const saveDashboardToStorage = (
  userId: string,
  dashboard: any,
): void => {
  try {
    const key = `dashboards_${userId}`;
    let existingDashboards = [];

    try {
      const stored = localStorage.getItem(key);
      existingDashboards = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error parsing existing dashboards:", e);
      existingDashboards = [];
    }

    const existingIndex = existingDashboards.findIndex(
      (d: any) => d.id === dashboard.id,
    );

    if (existingIndex >= 0) {
      existingDashboards[existingIndex] = dashboard;
    } else {
      existingDashboards.push(dashboard);
    }

    localStorage.setItem(key, JSON.stringify(existingDashboards));
    console.log("Dashboard saved to localStorage");
  } catch (error) {
    console.error("Error saving dashboard to localStorage:", error);
  }
};

export const loadDashboardsFromStorage = (userId: string): any[] => {
  try {
    const key = `dashboards_${userId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading dashboards from localStorage:", error);
    return [];
  }
};
