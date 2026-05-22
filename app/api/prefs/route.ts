import { NextResponse } from "next/server";
import { upsertUserPrefs } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { risk_tolerance } = body;
  if (!["conservative", "moderate", "aggressive"].includes(risk_tolerance)) {
    return NextResponse.json({ error: "Invalid risk_tolerance" }, { status: 400 });
  }
  await upsertUserPrefs({ risk_tolerance });
  return NextResponse.json({ ok: true });
}
