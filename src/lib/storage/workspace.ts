import type { TraderProfile } from "../matching/types";
import type { AdvisoryReport } from "../matching/report";
import type { TradeHistorySummary } from "../trading-history/types";

export type TraderUserSession = {
  id: string;
  name: string;
  email: string;
  experienceYears: number;
  primaryMarkets: string;
  createdAt: string;
};

export type SavedAdvisoryDossier = {
  id: string;
  title: string;
  createdAt: string;
  profile: TraderProfile;
  history: TradeHistorySummary | null;
  report: AdvisoryReport;
  notes?: string;
};

const USER_SESSION_KEY = "propfirm-user-session";
const USERS_REGISTRY_KEY = "propfirm-registered-users";
const SAVED_REPORTS_KEY = "propfirm-saved-dossiers";
const ACTIVE_PROFILE_KEY = "propfirm-active-profile";
export const HISTORY_SUMMARY_KEY = "propfirm-history-summary";

type StoredUserRecord = TraderUserSession & {
  passcodeHash: string;
};

function simpleHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function getActiveUserSession(): TraderUserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    return raw ? (JSON.parse(raw) as TraderUserSession) : null;
  } catch {
    return null;
  }
}

export function registerTraderAccount(params: {
  name: string;
  email: string;
  passcode: string;
  experienceYears?: number;
  primaryMarkets?: string;
}): { session?: TraderUserSession; error?: string } {
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  if (!name || name.length < 2) return { error: "Enter your name (at least 2 characters)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!params.passcode || params.passcode.length < 6) {
    return { error: "Choose an advisory workspace passcode of at least 6 characters." };
  }

  try {
    const existingRaw = localStorage.getItem(USERS_REGISTRY_KEY);
    const registry: StoredUserRecord[] = existingRaw ? (JSON.parse(existingRaw) as StoredUserRecord[]) : [];
    const existingIdx = registry.findIndex((u) => u.email === email);
    const record: StoredUserRecord = {
      id: existingIdx >= 0 ? registry[existingIdx].id : `trader-${Date.now()}`,
      name,
      email,
      experienceYears: params.experienceYears ?? 3,
      primaryMarkets: params.primaryMarkets ?? "Forex & Metals",
      createdAt: existingIdx >= 0 ? registry[existingIdx].createdAt : new Date().toISOString(),
      passcodeHash: simpleHash(`${email}:${params.passcode}`),
    };
    if (existingIdx >= 0) {
      registry[existingIdx] = record;
    } else {
      registry.push(record);
    }
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
    const { passcodeHash: _unused, ...session } = record;
    void _unused;
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event("propfirm-workspace-change"));
    return { session };
  } catch {
    return { error: "Browser storage is unavailable in this tab." };
  }
}

export function loginTraderAccount(params: {
  email: string;
  passcode: string;
}): { session?: TraderUserSession; error?: string } {
  const email = params.email.trim().toLowerCase();
  if (!email || !params.passcode) return { error: "Enter both email and workspace passcode." };
  try {
    const existingRaw = localStorage.getItem(USERS_REGISTRY_KEY);
    const registry: StoredUserRecord[] = existingRaw ? (JSON.parse(existingRaw) as StoredUserRecord[]) : [];
    const found = registry.find((u) => u.email === email);
    if (!found) {
      return { error: "No local workspace found for this email. Create an account first." };
    }
    if (found.passcodeHash !== simpleHash(`${email}:${params.passcode}`)) {
      return { error: "Incorrect workspace passcode." };
    }
    const { passcodeHash: _unused, ...session } = found;
    void _unused;
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event("propfirm-workspace-change"));
    return { session };
  } catch {
    return { error: "Unable to read local workspace storage." };
  }
}

export function logoutTraderAccount(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(USER_SESSION_KEY);
    window.dispatchEvent(new Event("propfirm-workspace-change"));
  } catch {
    // Ignore storage error
  }
}

export function getSavedDossiers(): SavedAdvisoryDossier[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_REPORTS_KEY);
    return raw ? (JSON.parse(raw) as SavedAdvisoryDossier[]) : [];
  } catch {
    return [];
  }
}

export function saveAdvisoryDossier(params: {
  title: string;
  profile: TraderProfile;
  history: TradeHistorySummary | null;
  report: AdvisoryReport;
  notes?: string;
}): SavedAdvisoryDossier | null {
  if (typeof window === "undefined") return null;
  try {
    const current = getSavedDossiers();
    const dossier: SavedAdvisoryDossier = {
      id: `dossier-${Date.now()}`,
      title:
        params.title.trim() ||
        `${params.report.executiveRecommendation.primaryAccount?.firmName ?? "Advisory"} · ${params.profile.tradingStyle} Consultation`,
      createdAt: new Date().toISOString(),
      profile: params.profile,
      history: params.history,
      report: params.report,
      notes: params.notes,
    };
    const next = [dossier, ...current].slice(0, 25);
    localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("propfirm-workspace-change"));
    return dossier;
  } catch {
    return null;
  }
}

export function deleteSavedDossier(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = getSavedDossiers().filter((d) => d.id !== id);
    localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("propfirm-workspace-change"));
  } catch {
    // Ignore storage error
  }
}

export function saveActiveProfileDraft(profile: TraderProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event("propfirm-workspace-change"));
  } catch {
    // Ignore storage error
  }
}

export function loadActiveProfileDraft(): TraderProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as TraderProfile) : null;
  } catch {
    return null;
  }
}
