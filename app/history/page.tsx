import { getCompletedRuns, getRunRecommendationSummary } from "@/lib/db";
import type { DailyRun } from "@/lib/db";
import Link from "next/link";

export const revalidate = 3600;

export default async function HistoryPage() {
  const runs = await getCompletedRuns(30);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">History</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Past daily scans — last 30 completed runs
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--text-muted)]">No completed scans yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <HistoryRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}

async function HistoryRow({ run }: { run: DailyRun }) {
  const recs = await getRunRecommendationSummary(run.run_date);

  const formattedDate = new Date(run.run_date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-white">{formattedDate}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {run.screened_count?.toLocaleString() ?? "—"} screened →{" "}
          {run.finalist_count ?? "—"} finalists
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {recs.map((r) => (
          <Link
            key={r.rank}
            href={`/stock/${r.ticker}?date=${run.run_date}`}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a2236] border border-[var(--border)] hover:border-[var(--blue)] transition-colors text-sm"
          >
            <span className="text-[var(--text-muted)] text-xs">#{r.rank}</span>
            <span className="font-semibold text-white">{r.ticker}</span>
            <span
              className={`text-xs ${
                r.signal === "Buy Now" ? "text-[var(--green)]" : "text-[var(--yellow)]"
              }`}
            >
              {r.signal}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
