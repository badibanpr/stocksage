import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // optional: fetch specific date

  let query = supabase
    .from("recommendations")
    .select("*")
    .order("rank", { ascending: true });

  if (date) {
    query = query.eq("run_date", date);
  } else {
    // Latest run — get the most recent completed run date
    const { data: latestRun } = await supabase
      .from("daily_runs")
      .select("run_date")
      .eq("status", "complete")
      .order("run_date", { ascending: false })
      .limit(1)
      .single();

    if (!latestRun) {
      return NextResponse.json({ recommendations: [], runDate: null });
    }
    query = query.eq("run_date", latestRun.run_date);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    recommendations: data ?? [],
    runDate: data?.[0]?.run_date ?? null,
  });
}
