"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { TradeHistorySummary } from "../trading-history/types";
import { HISTORY_SUMMARY_KEY } from "./workspace";

const changed = "propfirm-history-summary-change";
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(changed, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changed, callback);
  };
};
const readRaw = () => {
  try {
    return localStorage.getItem(HISTORY_SUMMARY_KEY);
  } catch {
    return null;
  }
};

export function useTradeSummary(): TradeHistorySummary | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => {
    try {
      const summary = raw ? (JSON.parse(raw) as TradeHistorySummary) : null;
      return summary && Number.isFinite(summary.tradeCount) ? summary : null;
    } catch {
      return null;
    }
  }, [raw]);
}

export function storeTradeSummary(summary: TradeHistorySummary | null): boolean {
  try {
    if (summary) localStorage.setItem(HISTORY_SUMMARY_KEY, JSON.stringify(summary));
    else localStorage.removeItem(HISTORY_SUMMARY_KEY);
    window.dispatchEvent(new Event(changed));
    return true;
  } catch {
    return false;
  }
}
