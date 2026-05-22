import { NextResponse } from "next/server";
import { runQuantScreener } from "@/lib/screener";
import { enrichFinalists, fetchMacroContext } from "@/lib/enricher";
import { rankWithClaude } from "@/lib/analyzer";
import { supabase } from "@/lib/supabase";

export const maxDuration = 300; // 5 minutes (Vercel Pro)

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron or an authorized internal request
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runDate = new Date().toISOString().split("T")[0];

  // Create a run record
  const { data: run, error: runError } = await supabase
    .from("daily_runs")
    .insert({ run_date: runDate, status: "running" })
    .select()
    .single();

  if (runError || !run) {
    console.error("Failed to create run record:", runError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  try {
    // Stage 1: Quant screener
    const screenerResults = await runQuantScreener();

    await supabase
      .from("daily_runs")
      .update({ screened_count: screenerResults.length })
      .eq("id", run.id);

    // Stage 2: Enrich finalists + macro context
    const [enriched, macro] = await Promise.all([
      enrichFinalists(screenerResults),
      fetchMacroContext(),
    ]);

    await supabase
      .from("daily_runs")
      .update({ finalist_count: enriched.length })
      .eq("id", run.id);

    // Stage 3: Claude AI ranking
    const recommendations = await rankWithClaude(enriched, macro);

    // Store recommendations
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

    const { error: insertError } = await supabase.from("recommendations").insert(rows);
    if (insertError) throw insertError;

    // Mark run complete
    await supabase
      .from("daily_runs")
      .update({ status: "complete" })
      .eq("id", run.id);

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
    await supabase
      .from("daily_runs")
      .update({ status: "failed", error: message })
      .eq("id", run.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
