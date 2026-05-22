import { NextResponse } from "next/server";
import { runQuantScreener } from "@/lib/screener";
import { enrichFinalists, fetchMacroContext } from "@/lib/enricher";
import { rankWithClaude } from "@/lib/analyzer";
import { createRun, updateRun, insertRecommendations } from "@/lib/db";

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runDate = new Date().toISOString().split("T")[0];
  const run = await createRun(runDate);

  try {
    const screenerResults = await runQuantScreener();
    await updateRun(run.id, { screened_count: screenerResults.length });

    const [enriched, macro] = await Promise.all([
      enrichFinalists(screenerResults),
      fetchMacroContext(),
    ]);
    await updateRun(run.id, { finalist_count: enriched.length });

    const recommendations = await rankWithClaude(enriched, macro);

    const rows = recommendations.map((r) => {
      const stock = enriched.find((s) => s.ticker === r.ticker);
      return {
        run_id: run.id,
        run_date: runDate,
        rank: r.rank,
        ticker: r.ticker,
        company_name: stock?.companyName ?? r.ticker,
        sector: stock?.sector ?? "Unknown",
        signal: r.signal,
        thesis: r.thesis,
        risk_score: r.riskScore,
        risk_rationale: r.riskRationale,
        pe_ratio: stock?.peRatio ?? null,
        revenue_growth_yoy: stock?.revenueGrowthYoy ?? null,
        market_cap: stock?.marketCap ?? null,
        price: stock?.price ?? null,
        price_change_3m: stock?.priceChange3M ?? null,
        catalyst: r.catalyst,
      };
    });

    await insertRecommendations(rows);
    await updateRun(run.id, { status: "complete" });

    return NextResponse.json({
      success: true,
      runDate,
      screened: screenerResults.length,
      finalists: enriched.length,
      picks: recommendations.map((r) => r.ticker),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Daily scan failed:", message);
    await updateRun(run.id, { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
