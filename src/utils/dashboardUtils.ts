import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage } from "./errorHandling";

export const checkCustomCalculationsAccess = async (): Promise<{
  accessible: boolean;
  error?: string;
}> => {
  try {
    // Since custom_calculations table doesn't exist in schema, return false
    console.warn("⚠️ custom_calculations table not found in schema");
    return {
      accessible: false,
      error: "Table not found in database schema",
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
  return false; // Disabled until custom_calculations table is available
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
