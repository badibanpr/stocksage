// Enrich screener finalists with news sentiment (Finnhub) and macro context (FRED)

import type { ScreenerResult } from "./screener";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const FINNHUB_BASE = "https://finnhub.io/api/v1";
const fmpKey = () => process.env.FMP_API_KEY!;
const finnhubKey = () => process.env.FINNHUB_API_KEY!;

export interface EnrichedStock extends ScreenerResult {
  newsSentiment: "Bullish" | "Bearish" | "Neutral";
  recentHeadlines: { headline: string; source: string; url: string }[];
  nextEarningsDate: string | null;
  epsSurprises: { date: string; actual: number; estimate: number; surprise: number }[];
  freeCashFlow: number | null;
  grossMargin: number | null;
}

export interface MacroContext {
  fedFundsRate: number | null;
  cpiYoy: number | null;
  unemploymentRate: number | null;
}

export async function enrichFinalists(
  stocks: ScreenerResult[],
  batchSize = 10
): Promise<EnrichedStock[]> {
  const results: EnrichedStock[] = [];
  // Process in batches to respect rate limits
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize);
    const enriched = await Promise.allSettled(batch.map(enrichSingle));
    for (const r of enriched) {
      if (r.status === "fulfilled") results.push(r.value);
    }
    // Small delay between batches
    if (i + batchSize < stocks.length) await sleep(500);
  }
  return results;
}

async function enrichSingle(stock: ScreenerResult): Promise<EnrichedStock> {
  const [sentiment, earnings] = await Promise.allSettled([
    fetchNewsSentiment(stock.ticker),
    fetchEarningsData(stock.ticker),
  ]);

  const sentimentData = sentiment.status === "fulfilled" ? sentiment.value : null;
  const earningsData = earnings.status === "fulfilled" ? earnings.value : null;

  return {
    ...stock,
    newsSentiment: sentimentData?.sentiment ?? "Neutral",
    recentHeadlines: sentimentData?.headlines ?? [],
    nextEarningsDate: earningsData?.nextDate ?? null,
    epsSurprises: earningsData?.surprises ?? [],
    freeCashFlow: null, // from FMP financials if needed
    grossMargin: null,
  };
}

async function fetchNewsSentiment(ticker: string) {
  const url = `${FINNHUB_BASE}/news-sentiment?symbol=${ticker}&token=${finnhubKey()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();

  const score: number = data?.sentiment?.bearishPercent != null
    ? data.sentiment.bullishPercent - data.sentiment.bearishPercent
    : 0;

  const sentiment: "Bullish" | "Bearish" | "Neutral" =
    score > 0.1 ? "Bullish" : score < -0.1 ? "Bearish" : "Neutral";

  // Also grab recent news headlines
  const newsRes = await fetch(
    `${FINNHUB_BASE}/company-news?symbol=${ticker}&from=${daysAgo(7)}&to=${today()}&token=${finnhubKey()}`
  );
  const newsData = newsRes.ok ? await newsRes.json() : [];
  const headlines = (newsData as FinnhubNews[])
    .slice(0, 5)
    .map((n) => ({ headline: n.headline, source: n.source, url: n.url }));

  return { sentiment, headlines };
}

async function fetchEarningsData(ticker: string) {
  const url = `${FMP_BASE}/historical/earning_calendar/${ticker}?apikey=${fmpKey()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data: FMPEarnings[] = await res.json();

  const future = data.filter((e) => new Date(e.date) > new Date());
  const nextDate = future[0]?.date ?? null;

  const past = data
    .filter((e) => new Date(e.date) <= new Date() && e.epsActual != null && e.epsEstimated != null)
    .slice(0, 4)
    .map((e) => ({
      date: e.date,
      actual: e.epsActual!,
      estimate: e.epsEstimated!,
      surprise: e.epsEstimated! !== 0
        ? ((e.epsActual! - e.epsEstimated!) / Math.abs(e.epsEstimated!)) * 100
        : 0,
    }));

  return { nextDate, surprises: past };
}

export async function fetchMacroContext(): Promise<MacroContext> {
  const fredKey = process.env.FRED_API_KEY;
  if (!fredKey) return { fedFundsRate: null, cpiYoy: null, unemploymentRate: null };

  const [ffr, cpi, unemp] = await Promise.allSettled([
    fetchFredSeries("FEDFUNDS", fredKey),
    fetchFredSeries("CPIAUCSL", fredKey),
    fetchFredSeries("UNRATE", fredKey),
  ]);

  return {
    fedFundsRate: ffr.status === "fulfilled" ? ffr.value : null,
    cpiYoy: cpi.status === "fulfilled" ? cpi.value : null,
    unemploymentRate: unemp.status === "fulfilled" ? unemp.value : null,
  };
}

async function fetchFredSeries(series: string, apiKey: string): Promise<number | null> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${apiKey}&sort_order=desc&limit=1&file_type=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const val = data?.observations?.[0]?.value;
  return val != null ? parseFloat(val) : null;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface FinnhubNews {
  headline: string;
  source: string;
  url: string;
}

interface FMPEarnings {
  date: string;
  epsActual: number | null;
  epsEstimated: number | null;
}
