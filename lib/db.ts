import { neon } from "@neondatabase/serverless";

function getDb() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

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

// ── Daily Runs ──────────────────────────────────────────────────────────────

export async function createRun(runDate: string): Promise<DailyRun> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO daily_runs (run_date, status)
    VALUES (${runDate}, 'running')
    RETURNING *
  `;
  return rows[0] as DailyRun;
}

export async function updateRun(
  id: string,
  fields: Partial<Pick<DailyRun, "status" | "screened_count" | "finalist_count" | "error">>
): Promise<void> {
  const sql = getDb();
  if (fields.screened_count !== undefined) {
    await sql`UPDATE daily_runs SET screened_count = ${fields.screened_count} WHERE id = ${id}`;
  }
  if (fields.finalist_count !== undefined) {
    await sql`UPDATE daily_runs SET finalist_count = ${fields.finalist_count} WHERE id = ${id}`;
  }
  if (fields.error !== undefined) {
    await sql`UPDATE daily_runs SET error = ${fields.error}, status = 'failed' WHERE id = ${id}`;
  } else if (fields.status !== undefined) {
    await sql`UPDATE daily_runs SET status = ${fields.status} WHERE id = ${id}`;
  }
}

export async function getLatestCompletedRun(): Promise<DailyRun | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM daily_runs
    WHERE status = 'complete'
    ORDER BY run_date DESC
    LIMIT 1
  `;
  return (rows[0] as DailyRun) ?? null;
}

export async function getCompletedRuns(limit = 30): Promise<DailyRun[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM daily_runs
    WHERE status = 'complete'
    ORDER BY run_date DESC
    LIMIT ${limit}
  `;
  return rows as DailyRun[];
}

// ── Recommendations ─────────────────────────────────────────────────────────

export interface InsertRecommendation {
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
}

export async function insertRecommendations(rows: InsertRecommendation[]): Promise<void> {
  const sql = getDb();
  for (const r of rows) {
    await sql`
      INSERT INTO recommendations
        (run_id, run_date, rank, ticker, company_name, sector, signal, thesis,
         risk_score, risk_rationale, pe_ratio, revenue_growth_yoy,
         market_cap, price, price_change_3m, catalyst)
      VALUES
        (${r.run_id}, ${r.run_date}, ${r.rank}, ${r.ticker}, ${r.company_name},
         ${r.sector}, ${r.signal}, ${r.thesis}, ${r.risk_score}, ${r.risk_rationale},
         ${r.pe_ratio}, ${r.revenue_growth_yoy}, ${r.market_cap}, ${r.price},
         ${r.price_change_3m}, ${r.catalyst})
    `;
  }
}

export async function getRecommendationsByDate(runDate: string): Promise<Recommendation[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM recommendations
    WHERE run_date = ${runDate}
    ORDER BY rank ASC
  `;
  return rows as Recommendation[];
}

export async function getRecommendationByTicker(
  ticker: string,
  runDate: string
): Promise<Recommendation | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM recommendations
    WHERE ticker = ${ticker} AND run_date = ${runDate}
    LIMIT 1
  `;
  return (rows[0] as Recommendation) ?? null;
}

export async function getRunRecommendationSummary(
  runDate: string
): Promise<Pick<Recommendation, "ticker" | "signal" | "rank">[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT ticker, signal, rank FROM recommendations
    WHERE run_date = ${runDate}
    ORDER BY rank ASC
  `;
  return rows as Pick<Recommendation, "ticker" | "signal" | "rank">[];
}

// ── User Prefs ───────────────────────────────────────────────────────────────

export async function getUserPrefs(): Promise<UserPrefs | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM user_prefs WHERE id = 'singleton' LIMIT 1`;
  return (rows[0] as UserPrefs) ?? null;
}

export async function upsertUserPrefs(
  fields: Partial<Pick<UserPrefs, "risk_tolerance" | "last_manual_refresh">>
): Promise<void> {
  const sql = getDb();
  if (fields.risk_tolerance !== undefined) {
    await sql`
      INSERT INTO user_prefs (id, risk_tolerance)
      VALUES ('singleton', ${fields.risk_tolerance})
      ON CONFLICT (id) DO UPDATE SET risk_tolerance = EXCLUDED.risk_tolerance
    `;
  }
  if (fields.last_manual_refresh !== undefined) {
    await sql`
      INSERT INTO user_prefs (id, last_manual_refresh)
      VALUES ('singleton', ${fields.last_manual_refresh})
      ON CONFLICT (id) DO UPDATE SET last_manual_refresh = EXCLUDED.last_manual_refresh
    `;
  }
}
