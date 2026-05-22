import { getLatestCompletedRun, getRecommendationByTicker } from "@/lib/db";
import type { Recommendation } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import DisclaimerBanner from "@/components/DisclaimerBanner";

interface Props {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ date?: string }>;
}

const signalColors = {
  "Buy Now": "text-[var(--green)] border-[var(--green)] bg-green-950/30",
  Watch: "text-[var(--yellow)] border-[var(--yellow)] bg-yellow-950/30",
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
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

export const dynamic = "force-dynamic";

export default async function StockPage({ params, searchParams }: Props) {
  const { ticker } = await params;
  const { date } = await searchParams;

  const runDate = date ?? (await getLatestCompletedRun())?.run_date ?? null;
  if (!runDate) return notFound();

  const rec: Recommendation | null = await getRecommendationByTicker(
    ticker.toUpperCase(),
    runDate
  );
  if (!rec) return notFound();

  const formattedDate = new Date(rec.run_date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-white transition-colors">
        ← Back to Today&apos;s Picks
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-4xl font-bold text-white">{rec.ticker}</h1>
          <span
            className={`px-3 py-1 rounded-lg border text-sm font-semibold ${signalColors[rec.signal]}`}
          >
            {rec.signal}
          </span>
          <span className={`text-sm font-semibold ${riskColors[rec.risk_score]}`}>
            {rec.risk_score} Risk
          </span>
        </div>
        <p className="text-lg text-[var(--text-muted)]">{rec.company_name}</p>
        <p className="text-sm text-[var(--text-muted)]">
          #{rec.rank} pick · {rec.sector} · {formattedDate}
        </p>
      </div>

      <DisclaimerBanner />

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Key Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Price" value={rec.price != null ? `$${rec.price.toFixed(2)}` : "—"} />
          <Stat label="Market Cap" value={fmtMCap(rec.market_cap)} />
          <Stat label="P/E Ratio" value={fmt(rec.pe_ratio)} />
          <Stat label="Revenue Growth" value={fmt(rec.revenue_growth_yoy, true)} />
        </div>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Investment Thesis
        </h2>
        <p className="text-[var(--text-primary)] leading-relaxed">{rec.thesis}</p>
      </div>

      {rec.catalyst && (
        <div className="card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--blue)] uppercase tracking-wider">
            Near-Term Catalyst
          </h2>
          <p className="text-[var(--text-primary)]">{rec.catalyst}</p>
        </div>
      )}

      <div className="card p-6 space-y-3">
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${riskColors[rec.risk_score]}`}>
          {rec.risk_score} Risk
        </h2>
        <p className="text-[var(--text-muted)]">{rec.risk_rationale}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
