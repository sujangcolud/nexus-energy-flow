
import { supabase } from "@/integrations/supabase/client";

export interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  totalExpenses: number;
  totalUsers: number;
}

export const fetchDashboardData = async (userId: string): Promise<DashboardData> => {
  try {
    // Since custom_calculations table doesn't exist, we'll calculate manually
    const { data: ordersData } = await supabase
      .from("orders")
      .select("total")
      .eq("user_id", userId);

    const { data: expensesData } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", userId);

    const { data: usersData } = await supabase
      .from("profiles")
      .select("id");

    const totalOrders = ordersData?.length || 0;
    const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const totalExpenses = expensesData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    const totalUsers = usersData?.length || 0;

    return {
      totalOrders,
      totalRevenue,
      totalExpenses,
      totalUsers
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      totalUsers: 0
    };
  }
};
