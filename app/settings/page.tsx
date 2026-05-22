"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { UserPrefs } from "@/lib/supabase";

const options: { value: UserPrefs["risk_tolerance"]; label: string; description: string }[] = [
  {
    value: "conservative",
    label: "Conservative",
    description: "Prefer low-risk, established companies with strong balance sheets.",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Balance between growth and stability. Comfortable with some volatility.",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Prioritize high-growth opportunities, willing to accept higher risk.",
  },
];

export default function SettingsPage() {
  const [selected, setSelected] = useState<UserPrefs["risk_tolerance"]>("moderate");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from("user_prefs")
      .upsert({ id: "singleton", risk_tolerance: selected });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Customize how StockSage selects and presents picks.
        </p>
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Risk Tolerance
        </h2>
        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                selected === opt.value
                  ? "border-[var(--blue)] bg-blue-950/30"
                  : "border-[var(--border)] hover:border-[#2d4a6e]"
              }`}
            >
              <p className="font-semibold text-white">{opt.label}</p>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-[var(--blue)] hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition-colors"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Settings"}
        </button>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          About
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          StockSage runs a two-stage pipeline nightly: a quantitative screener filters ~6,000 US
          stocks down to 50–100 quality finalists, then Claude AI analyzes each finalist and
          selects the top 5 long-term investment picks with thesis and risk scoring.
        </p>
        <p className="text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
          Data: Financial Modeling Prep · Finnhub · FRED · Anthropic Claude
        </p>
      </div>
    </div>
  );
}
