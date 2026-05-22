// Stage 1: FMP bulk quant screener — narrows ~6,000 US stocks to ~50-100 finalists

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const key = () => process.env.FMP_API_KEY!;

export interface ScreenerResult {
  ticker: string;
  companyName: string;
  sector: string;
  marketCap: number;
  price: number;
  peRatio: number | null;
  revenueGrowthYoy: number | null;
  netIncomeMargin: number | null;
  debtToEquity: number | null;
  priceVs200MA: number | null; // % above/below 200-day MA
  priceChange3M: number | null;
  interestCoverage: number | null;
}

export async function runQuantScreener(): Promise<ScreenerResult[]> {
  // FMP screener with baseline filters
  const params = new URLSearchParams({
    marketCapMoreThan: "500000000",     // min $500M market cap
    country: "US",
    isEtf: "false",
    isFund: "false",
    limit: "3000",
    apikey: key(),
  });

  const res = await fetch(`${FMP_BASE}/stock-screener?${params}`);
  if (!res.ok) throw new Error(`FMP screener failed: ${res.status}`);
  const raw: FMPScreenerRow[] = await res.json();

  // Apply quality filters
  const finalists = raw.filter(applyQualityFilters);

  // Sort by composite score and cap at 100
  const scored = finalists
    .map((r) => ({ ...r, score: computeScore(r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);

  return scored.map(toScreenerResult);
}

interface FMPScreenerRow {
  symbol: string;
  companyName: string;
  sector: string | null;
  marketCap: number;
  price: number;
  beta: number | null;
  volume: number | null;
  lastAnnualDividend: number | null;
  exchange: string | null;
  isEtf: boolean;
  isFund: boolean;
  isActivelyTrading: boolean;
  // These come from the screener endpoint
  peRatio?: number | null;
  netProfitMargin?: number | null;
  revenueGrowth?: number | null;
  debtEquityRatio?: number | null;
  priceToBookRatio?: number | null;
  returnOnEquity?: number | null;
  score?: number;
}

function applyQualityFilters(r: FMPScreenerRow): boolean {
  // Must be actively trading
  if (!r.isActivelyTrading) return false;
  // Skip penny stocks
  if (r.price < 5) return false;
  // Skip if no sector data
  if (!r.sector) return false;
  // Reasonable P/E (not wildly speculative or negative)
  if (r.peRatio !== undefined && r.peRatio !== null) {
    if (r.peRatio < 0 || r.peRatio > 500) return false;
  }
  // Positive net margin preferred, allow slightly negative for high-growth
  if (r.netProfitMargin !== undefined && r.netProfitMargin !== null) {
    if (r.netProfitMargin < -0.15) return false; // more than 15% loss margin — skip
  }
  // Debt/equity sanity check
  if (r.debtEquityRatio !== undefined && r.debtEquityRatio !== null) {
    if (r.debtEquityRatio > 10) return false; // extremely leveraged
  }
  return true;
}

function computeScore(r: FMPScreenerRow): number {
  let score = 0;
  // Revenue growth
  if (r.revenueGrowth && r.revenueGrowth > 0.1) score += 20;
  else if (r.revenueGrowth && r.revenueGrowth > 0) score += 10;
  // Profitability
  if (r.netProfitMargin && r.netProfitMargin > 0.15) score += 25;
  else if (r.netProfitMargin && r.netProfitMargin > 0) score += 15;
  // Valuation (lower P/E = more value)
  if (r.peRatio && r.peRatio < 20) score += 15;
  else if (r.peRatio && r.peRatio < 35) score += 8;
  // ROE
  if (r.returnOnEquity && r.returnOnEquity > 0.15) score += 20;
  else if (r.returnOnEquity && r.returnOnEquity > 0) score += 10;
  // Balance sheet
  if (r.debtEquityRatio !== undefined && r.debtEquityRatio !== null) {
    if (r.debtEquityRatio < 1) score += 20;
    else if (r.debtEquityRatio < 2) score += 10;
  }
  return score;
}

function toScreenerResult(r: FMPScreenerRow): ScreenerResult {
  return {
    ticker: r.symbol,
    companyName: r.companyName,
    sector: r.sector ?? "Unknown",
    marketCap: r.marketCap,
    price: r.price,
    peRatio: r.peRatio ?? null,
    revenueGrowthYoy: r.revenueGrowth ?? null,
    netIncomeMargin: r.netProfitMargin ?? null,
    debtToEquity: r.debtEquityRatio ?? null,
    priceVs200MA: null, // enriched separately if needed
    priceChange3M: null,
    interestCoverage: null,
  };
}
