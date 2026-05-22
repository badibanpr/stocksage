import RecommendationCard from "@/components/RecommendationCard";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { getLatestCompletedRun, getRecommendationsByDate } from "@/lib/db";
import type { Recommendation } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getLatestRecommendations(): Promise<{
  recs: Recommendation[];
  runDate: string | null;
}> {
  const run = await getLatestCompletedRun();
  if (!run) return { recs: [], runDate: null };
  const recs = await getRecommendationsByDate(run.run_date);
  return { recs, runDate: run.run_date };
}

export const revalidate = 3600;

export default async function HomePage() {
  const { recs, runDate } = await getLatestRecommendations();

  const formattedDate = runDate
    ? new Date(runDate + "T12:00:00Z").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Today&apos;s Top Picks</h1>
        {formattedDate && (
          <p className="text-[var(--text-muted)] text-sm">
            Analysis for {formattedDate} · {recs.length} picks from full market scan
          </p>
        )}
      </div>

      <DisclaimerBanner />

      {recs.length > 0 ? (
        <div className="space-y-4">
          {recs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center space-y-3">
          <p className="text-4xl">📊</p>
          <p className="text-lg font-semibold text-white">No picks yet today</p>
          <p className="text-sm text-[var(--text-muted)]">
            The daily scan runs overnight. Check back in the morning, or trigger a manual
            refresh below.
          </p>
          <RefreshButton />
        </div>
      )}

      {recs.length > 0 && (
        <div className="flex justify-center pt-4">
          <RefreshButton />
        </div>
      )}
    </div>
  );
}

function RefreshButton() {
  return (
    <form
      action={async () => {
        "use server";
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          await fetch(`${appUrl}/api/refresh`, { method: "POST", cache: "no-store" });
        } catch (err) {
          console.error("Refresh error:", err);
        }
        revalidatePath("/");
      }}
    >
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-[var(--blue)] hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
      >
        Refresh Now
      </button>
    </form>
  );
}
