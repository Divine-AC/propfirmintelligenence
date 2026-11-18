"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { TradeHistorySummary } from "@/lib/trading-history/types";
import { getActiveUserSession, getSavedDossiers } from "@/lib/storage/workspace";

const subscribeWorkspace = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("propfirm-history-summary-change", callback);
  window.addEventListener("propfirm-workspace-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("propfirm-history-summary-change", callback);
    window.removeEventListener("propfirm-workspace-change", callback);
  };
};

const getHistoryRaw = () => {
  try {
    return localStorage.getItem("propfirm-history-summary");
  } catch {
    return null;
  }
};

const getSavedCount = () => {
  try {
    return getSavedDossiers().length;
  } catch {
    return 0;
  }
};

const getUserName = () => {
  try {
    return getActiveUserSession()?.name ?? null;
  } catch {
    return null;
  }
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Find matches" },
  { href: "/history", label: "Trade history" },
  { href: "/compare", label: "Compare" },
  { href: "/reports", label: "Saved reports" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const historyRaw = useSyncExternalStore(subscribeWorkspace, getHistoryRaw, () => null);
  const savedCount = useSyncExternalStore(subscribeWorkspace, getSavedCount, () => 0);
  const userName = useSyncExternalStore(subscribeWorkspace, getUserName, () => null);

  let historyTradeCount: number | null = null;
  if (historyRaw) {
    try {
      const parsed = JSON.parse(historyRaw) as TradeHistorySummary;
      historyTradeCount = parsed.tradeCount ?? null;
    } catch {
      historyTradeCount = null;
    }
  }

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-sm font-semibold tracking-wide text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-xs font-bold text-cyan-300 shadow-inner transition group-hover:border-cyan-400/60 group-hover:bg-cyan-400/20">
              PFI
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white">PropFirm Intelligence</span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:block">
                Research &amp; Advisory System
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition lg:text-sm ${
                  active
                    ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30"
                    : "text-slate-300 hover:bg-slate-900/90 hover:text-white"
                }`}
              >
                <span>{link.label}</span>
                {link.href === "/reports" && savedCount > 0 && (
                  <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200 tabular-nums">
                    {savedCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Status pills & workspace account */}
        <div className="flex items-center gap-2">
          {historyTradeCount !== null && (
            <Link
              href="/history"
              title="Trading history summary is loaded in this browser"
              className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 transition hover:border-emerald-400/60 sm:inline-flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>History loaded · {historyTradeCount} trades</span>
            </Link>
          )}

          <Link
            href="/reports"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
          >
            <span
              className={`h-2 w-2 rounded-full ${userName ? "bg-cyan-400" : "bg-slate-500"}`}
              aria-hidden="true"
            />
            <span>{userName ? userName : "My workspace"}</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
            className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:border-slate-700 hover:text-white md:hidden"
          >
            <span className="text-xs font-semibold">{mobileOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-800/80 bg-slate-950 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? "bg-cyan-400/15 text-cyan-300" : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.href === "/reports" && savedCount > 0 && (
                    <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                      {savedCount} saved
                    </span>
                  )}
                </Link>
              );
            })}
            {historyTradeCount !== null && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Empirical trade history loaded ({historyTradeCount} closed trades)</span>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
