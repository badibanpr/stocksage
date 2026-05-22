import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// On-demand refresh — rate limited to 1 per hour per user
export async function POST() {
  const { data: prefs } = await supabase
    .from("user_prefs")
    .select("last_manual_refresh")
    .limit(1)
    .single();

  if (prefs?.last_manual_refresh) {
    const lastRefresh = new Date(prefs.last_manual_refresh);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (lastRefresh > hourAgo) {
      const nextAllowed = new Date(lastRefresh.getTime() + 60 * 60 * 1000);
      return NextResponse.json(
        {
          error: "Rate limited",
          nextAllowed: nextAllowed.toISOString(),
        },
        { status: 429 }
      );
    }
  }

  // Trigger the cron endpoint internally
  const cronUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/daily-scan`;
  const res = await fetch(cronUrl, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ error: body.error ?? "Scan failed" }, { status: 500 });
  }

  // Update last refresh time
  await supabase
    .from("user_prefs")
    .upsert({ id: "singleton", last_manual_refresh: new Date().toISOString() });

  const result = await res.json();
  return NextResponse.json(result);
}
