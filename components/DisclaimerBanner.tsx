export default function DisclaimerBanner() {
  return (
    <div className="rounded-lg bg-[#1a1a2e] border border-[#2d2d4e] px-4 py-3 text-xs text-[var(--text-muted)] flex items-start gap-2">
      <span className="shrink-0 mt-0.5">⚠️</span>
      <span>
        <strong className="text-[var(--text-primary)]">Not financial advice.</strong> StockSage
        uses AI analysis of publicly available data for informational purposes only. Past
        performance does not guarantee future results. Always do your own research before
        investing.
      </span>
    </div>
  );
}
