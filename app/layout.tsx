import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockSage",
  description: "AI-powered daily stock picks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">Stock</span>
            <span className="text-xl font-bold text-[var(--blue)]">Sage</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
            <a href="/" className="hover:text-white transition-colors">Today</a>
            <a href="/history" className="hover:text-white transition-colors">History</a>
            <a href="/settings" className="hover:text-white transition-colors">Settings</a>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
        <footer className="text-center text-xs text-[var(--text-muted)] py-6 border-t border-[var(--border)] mt-12">
          Not financial advice. For informational purposes only. StockSage uses AI analysis and does not guarantee returns.
        </footer>
      </body>
    </html>
  );
}
