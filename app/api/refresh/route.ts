import { NextResponse } from "next/server";
import { getUserPrefs, upsertUserPrefs } from "@/lib/db";

export async function POST() {
  const prefs = await getUserPrefs();

  if (prefs?.last_manual_refresh) {
    const lastRefresh = new Date(prefs.last_manual_refresh);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (lastRefresh > hourAgo) {
      const nextAllowed = new Date(lastRefresh.getTime() + 60 * 60 * 1000);
      return NextResponse.json(
        { error: "Rate limited", nextAllowed: nextAllowed.toISOString() },
        { status: 429 }
      );
    }
  }

  const cronUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/daily-scan`;
  const res = await fetch(cronUrl, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ error: body.error ?? "Scan failed" }, { status: 500 });
  }

  await upsertUserPrefs({ last_manual_refresh: new Date().toISOString() });
  return NextResponse.json(await res.json());
}
