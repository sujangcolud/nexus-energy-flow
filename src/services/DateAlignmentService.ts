import { format, subDays, parseISO, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/**
 * Nexus Energy Flow operates on a Next-Day Recording Workflow:
 * activity on Date X is fully recorded/finalised on Date X+1.
 *
 * DateAlignmentService normalises business-date logic so dashboards and
 * the AI engine consistently distinguish:
 *   - Activity Date (business_date)  — when the money was earned
 *   - Entry Date    (created_at)     — when the record was keyed in
 */

export type DateMode = "activity" | "entry";

/** The most recent fully-completed business day (yesterday). */
export function getLastCompletedBusinessDay(now: Date = new Date()): Date {
  return subDays(now, 1);
}

/** Resolve "today" semantics → returns the date the user *means* by today. */
export function resolveBusinessToday(now: Date = new Date()): Date {
  return getLastCompletedBusinessDay(now);
}

export const isoDate = (d: Date) => format(d, "yyyy-MM-dd");

/** Range helpers honoring business-day semantics. */
export function businessRange(daysBack: number, now: Date = new Date()) {
  const end = getLastCompletedBusinessDay(now);
  const start = subDays(end, daysBack - 1);
  return { from: isoDate(start), to: isoDate(end) };
}

export function entryRange(daysBack: number, now: Date = new Date()) {
  const end = now;
  const start = subDays(end, daysBack - 1);
  return { from: isoDate(start), to: isoDate(end) };
}

/** Detect a recording lag (entry_date − activity_date) in days. */
export function recordingLagDays(activityDate: string, entryAt: string): number {
  return Math.max(0, differenceInCalendarDays(parseISO(entryAt), parseISO(activityDate)));
}

export interface BusinessPerformanceRow {
  business_date: string;
  day_of_week: string;
  dow: number;
  orders_revenue: number;
  orders_count: number;
  charging_revenue: number;
  charging_count: number;
  total_revenue: number;
  expenses_total: number;
  commission_total: number;
  deposits_total: number;
  withdrawals_total: number;
  energy_revenue_share_pct: number;
  commission_burden_pct: number;
}

/** Pull the daily_business_performance view for a business-date window. */
export async function fetchBusinessPerformance(
  from: string,
  to: string,
): Promise<BusinessPerformanceRow[]> {
  const { data, error } = await supabase
    .from("daily_business_performance" as any)
    .select("*")
    .gte("business_date", from)
    .lte("business_date", to)
    .order("business_date", { ascending: true });
  if (error) throw error;
  return ((data as unknown) as BusinessPerformanceRow[]) || [];
}

/** Insight: detect "Charging-as-Hook" days (energy share > 40% AND food sales above weekly average). */
export function detectHookDays(rows: BusinessPerformanceRow[]) {
  if (rows.length === 0) return [];
  const avgFood = rows.reduce((s, r) => s + r.orders_revenue, 0) / rows.length;
  return rows.filter(
    (r) => r.charging_revenue > 0 && r.energy_revenue_share_pct >= 40 && r.orders_revenue >= avgFood,
  );
}

/** Insight: rank days-of-week by avg commission burden. */
export function commissionBurdenByDow(rows: BusinessPerformanceRow[]) {
  const buckets: Record<number, { name: string; sum: number; n: number }> = {};
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const r of rows) {
    const k = r.dow;
    if (!buckets[k]) buckets[k] = { name: names[k] ?? String(k), sum: 0, n: 0 };
    buckets[k].sum += r.commission_burden_pct;
    buckets[k].n += 1;
  }
  return Object.entries(buckets)
    .map(([dow, v]) => ({ dow: Number(dow), day: v.name, avg_burden_pct: v.n ? v.sum / v.n : 0 }))
    .sort((a, b) => b.avg_burden_pct - a.avg_burden_pct);
}

/**
 * Balance integrity check — closing[X] should equal opening[X+1].
 * We compute the *expected* daily net change. If consecutive days break the
 * chain (gap or jump), surface it as a recording anomaly.
 */
export interface IntegrityFlag {
  business_date: string;
  net_change: number;
  delta_vs_prev: number;
  status: "ok" | "anomaly";
  reason?: string;
}

export function balanceIntegrity(rows: BusinessPerformanceRow[]): IntegrityFlag[] {
  const flags: IntegrityFlag[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const net = r.total_revenue + r.deposits_total - r.expenses_total - r.withdrawals_total;
    const prev = i > 0 ? rows[i - 1] : null;
    const prevNet = prev
      ? prev.total_revenue + prev.deposits_total - prev.expenses_total - prev.withdrawals_total
      : 0;
    const delta = net - prevNet;
    let status: "ok" | "anomaly" = "ok";
    let reason: string | undefined;
    if (prev) {
      const gap = differenceInCalendarDays(parseISO(r.business_date), parseISO(prev.business_date));
      if (gap > 1) {
        status = "anomaly";
        reason = `Gap of ${gap - 1} day(s) with no records — possible missing recording day.`;
      } else if (Math.abs(delta) > Math.max(5000, Math.abs(prevNet) * 2)) {
        status = "anomaly";
        reason = `Net change swung by Rs. ${Math.round(delta).toLocaleString()} vs previous day — verify entries.`;
      }
    }
    flags.push({ business_date: r.business_date, net_change: net, delta_vs_prev: delta, status, reason });
  }
  return flags;
}
