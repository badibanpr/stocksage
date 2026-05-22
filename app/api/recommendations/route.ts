import { NextResponse } from "next/server";
import { getLatestCompletedRun, getRecommendationsByDate } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  const runDate = date ?? (await getLatestCompletedRun())?.run_date ?? null;
  if (!runDate) return NextResponse.json({ recommendations: [], runDate: null });

  const recommendations = await getRecommendationsByDate(runDate);
  return NextResponse.json({ recommendations, runDate });
}
