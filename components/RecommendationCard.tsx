"use client";

import type { Recommendation } from "@/lib/supabase";
import Link from "next/link";

interface Props {
  rec: Recommendation;
}

const signalColors = {
  "Buy Now": "text-[var(--green)] border-[var(--green)]",
  Watch: "text-[var(--yellow)] border-[var(--yellow)]",
};

const riskColors = {
  Low: "text-[var(--green)]",
  Medium: "text-[var(--yellow)]",
  High: "text-[var(--red)]",
};

function fmt(n: number | null, pct = false, decimals = 1) {
  if (n == null) return "—";
  return pct ? `${(n * 100).toFixed(decimals)}%` : n.toFixed(decimals);
}

function fmtMCap(n: number | null) {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

export default function RecommendationCard({ rec }: Props) {
  return (
    <Link href={`/stock/${rec.ticker}`} className="block">
      <div className="card card-hover p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">#{rec.rank}</span>
              <span className="text-xl font-bold text-white">{rec.ticker}</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border ${signalColors[rec.signal]}`}
              >
                {rec.signal}
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{rec.company_name}</p>
            <p className="text-xs text-[var(--text-muted)]">{rec.sector}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-semibold text-white">
              {rec.price != null ? `$${rec.price.toFixed(2)}` : "—"}
            </p>
            <p
              className={`text-sm ${
                rec.price_change_3m != null && rec.price_change_3m >= 0
                  ? "text-[var(--green)]"
                  : "text-[var(--red)]"
              }`}
            >
              {rec.price_change_3m != null
                ? `${rec.price_change_3m >= 0 ? "+" : ""}${(rec.price_change_3m * 100).toFixed(1)}% (3M)`
                : ""}
            </p>
          </div>
        </div>

        {/* Thesis */}
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{rec.thesis}</p>

        {/* Catalyst */}
        {rec.catalyst && (
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-[var(--blue)] shrink-0 pt-0.5">
              CATALYST
            </span>
            <p className="text-xs text-[var(--text-muted)]">{rec.catalyst}</p>
          </div>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)] pt-1">
          <span>
            P/E: <span className="text-white">{fmt(rec.pe_ratio, false, 1)}</span>
          </span>
          <span>
            Rev Growth:{" "}
            <span className="text-white">{fmt(rec.revenue_growth_yoy, true)}</span>
          </span>
          <span>
            Market Cap: <span className="text-white">{fmtMCap(rec.market_cap)}</span>
          </span>
          <span>
            Risk:{" "}
            <span className={`font-semibold ${riskColors[rec.risk_score]}`}>
              {rec.risk_score}
            </span>
          </span>
        </div>

        {/* Risk rationale */}
        <p className="text-xs text-[var(--text-muted)] italic">{rec.risk_rationale}</p>
      </div>
    </Link>
  );
}
