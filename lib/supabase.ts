import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(url, key);

export type RiskScore = "Low" | "Medium" | "High";
export type Signal = "Buy Now" | "Watch";

export interface DailyRun {
  id: string;
  run_date: string;
  status: "pending" | "running" | "complete" | "failed";
  screened_count: number | null;
  finalist_count: number | null;
  error: string | null;
  created_at: string;
}

export interface Recommendation {
  id: string;
  run_id: string;
  run_date: string;
  rank: number;
  ticker: string;
  company_name: string;
  sector: string;
  signal: Signal;
  thesis: string;
  risk_score: RiskScore;
  risk_rationale: string;
  pe_ratio: number | null;
  revenue_growth_yoy: number | null;
  market_cap: number | null;
  price: number | null;
  price_change_3m: number | null;
  catalyst: string | null;
  created_at: string;
}

export interface UserPrefs {
  id: string;
  risk_tolerance: "conservative" | "moderate" | "aggressive";
  last_manual_refresh: string | null;
}
