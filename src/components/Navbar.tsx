"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const subscribeHistory = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("propfirm-history-summary-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("propfirm-history-summary-change", callback);
  };
};

const getHasHistory = () => {
  try {
    return Boolean(localStorage.getItem("propfirm-history-summary"));
  } catch {
    return false;
  }
};

const navLinks = [
  { href: "/", label: "Overview" },
  { href: "/matches", label: "Matches" },
  { href: "/history", label: "History" },
];

export function Navbar() {
  const pathname = usePathname();
  const hasHistory = useSyncExternalStore(subscribeHistory, getHasHistory, () => false);

  return (
    <nav aria-label="Primary" className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-wide text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-400" aria-hidden="true" />
          <span>PropFirm Intelligence</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-cyan-400/15 text-cyan-300"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {hasHistory && (
            <span
              title="Trading history summary is loaded in this browser"
              className="ml-1 hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 sm:inline-flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              History loaded
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
