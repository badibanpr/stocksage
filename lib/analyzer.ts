// Stage 2: Claude AI ranking pipeline — takes ~50-100 enriched finalists, returns top 5 picks

import Anthropic from "@anthropic-ai/sdk";
import type { EnrichedStock, MacroContext } from "./enricher";
import type { Signal, RiskScore } from "./db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AIRecommendation {
  rank: number;
  ticker: string;
  signal: Signal;
  thesis: string;
  riskScore: RiskScore;
  riskRationale: string;
  catalyst: string;
}

function formatStockData(stocks: EnrichedStock[]): string {
  return stocks
    .map((s) => {
      const eps = s.epsSurprises
        .map((e) => `${e.date}: actual=${e.actual} est=${e.estimate} surprise=${e.surprise.toFixed(1)}%`)
        .join("; ");
      return [
        `TICKER: ${s.ticker} (${s.companyName})`,
        `Sector: ${s.sector} | MCap: $${(s.marketCap / 1e9).toFixed(1)}B | Price: $${s.price}`,
        `PE: ${s.peRatio ?? "N/A"} | RevGrowthYoY: ${s.revenueGrowthYoy != null ? (s.revenueGrowthYoy * 100).toFixed(1) + "%" : "N/A"}`,
        `NetMargin: ${s.netIncomeMargin != null ? (s.netIncomeMargin * 100).toFixed(1) + "%" : "N/A"} | D/E: ${s.debtToEquity ?? "N/A"}`,
        `News Sentiment: ${s.newsSentiment} | NextEarnings: ${s.nextEarningsDate ?? "N/A"}`,
        eps ? `EPS Surprises: ${eps}` : null,
        s.recentHeadlines.length > 0
          ? `Headlines: ${s.recentHeadlines.map((h) => h.headline).slice(0, 3).join(" | ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

function formatMacro(macro: MacroContext): string {
  return [
    macro.fedFundsRate != null ? `Fed Funds Rate: ${macro.fedFundsRate}%` : null,
    macro.cpiYoy != null ? `CPI (YoY): ${macro.cpiYoy}%` : null,
    macro.unemploymentRate != null ? `Unemployment Rate: ${macro.unemploymentRate}%` : null,
  ]
    .filter(Boolean)
    .join(" | ") || "Macro data unavailable";
}

export async function rankWithClaude(
  finalists: EnrichedStock[],
  macro: MacroContext
): Promise<AIRecommendation[]> {
  const stockData = formatStockData(finalists);
  const macroSummary = formatMacro(macro);

  const prompt = `You are a professional long-term equity analyst. Your task is to select the top 5 US stocks from a pre-screened list of quality finalists for long-term investment (holding period: months to years).

## Macro Environment
${macroSummary}

## Screened Finalists (${finalists.length} stocks)
${stockData}

## Your Task
Analyze the finalists holistically. Consider:
- Business quality: moat, revenue growth trajectory, margin profile
- Valuation: P/E relative to sector, growth, and rate environment
- Balance sheet: debt sustainability, cash generation
- Momentum: near-term catalysts (earnings, sector tailwinds)
- Sentiment: news tone as a timing signal, not the thesis
- Macro fit: how does each pick perform in the current rate/inflation environment?

Select the top 5 picks for long-term holding. For each pick, provide:
1. Signal: "Buy Now" if compelling entry point today, "Watch" if strong but wait for better setup
2. A 3-5 sentence investment thesis (WHY this stock, WHY now, WHAT the long-term story is)
3. Risk score: Low / Medium / High
4. Risk rationale: 1-2 sentences on the key risks to the thesis
5. Primary catalyst: one specific near-term event or trend (e.g., "Q3 earnings on Oct 22 expected to show margin expansion")

Respond ONLY with a valid JSON array. No markdown, no commentary. Schema:
[
  {
    "rank": 1,
    "ticker": "AAPL",
    "signal": "Buy Now",
    "thesis": "...",
    "riskScore": "Low",
    "riskRationale": "...",
    "catalyst": "..."
  },
  ...
]`;

  const stream = await client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: "adaptive" } as any,
    messages: [{ role: "user", content: prompt }],
  });

  const response = await stream.finalMessage();

  // Extract text content from response (skip thinking blocks)
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Parse JSON — strip markdown fences if present
  const cleaned = text.replace(/```(?:json)?\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as AIRecommendation[];

  return parsed.slice(0, 5).map((r, i) => ({
    ...r,
    rank: i + 1,
    signal: r.signal === "Buy Now" ? "Buy Now" : "Watch",
    riskScore: (["Low", "Medium", "High"].includes(r.riskScore) ? r.riskScore : "Medium") as RiskScore,
  }));
}
