"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Activity,
  ArrowUpRight,
  ChartCandlestick,
  ChevronRight,
  Columns3,
  Crosshair,
  FolderClosed,
  LayoutGrid,
  Menu,
  PanelsTopLeft,
  UserRound,
  X,
} from "lucide-react";
import { getActiveUserSession, getSavedDossiers } from "@/lib/storage/workspace";
import { useTradeSummary } from "@/lib/storage/use-trade-summary";
import { Brand } from "./Brand";

const links = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/matches", label: "Find matches", icon: Crosshair },
  { href: "/history", label: "Trade history", icon: ChartCandlestick },
  { href: "/compare", label: "Compare", icon: Columns3 },
  { href: "/reports", label: "Saved reports", icon: FolderClosed },
];

const subscribe = (callback: () => void) => {
  const events = ["storage", "propfirm-workspace-change"];
  events.forEach((event) => window.addEventListener(event, callback));
  return () => events.forEach((event) => window.removeEventListener(event, callback));
};
const getSavedCount = () => getSavedDossiers().length;
const getName = () => getActiveUserSession()?.name ?? null;

export function Navbar() {
  const pathname = usePathname();
  return <WorkspaceNav key={pathname} pathname={pathname} />;
}

function WorkspaceNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const trades = useTradeSummary()?.tradeCount ?? 0;
  const saved = useSyncExternalStore(subscribe, getSavedCount, () => 0);
  const name = useSyncExternalStore(subscribe, getName, () => null);
  const current = links.find((link) => link.href === pathname)?.label ?? "Workspace";

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function navLinks() {
    return links.map(({ href, label, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        aria-current={pathname === href ? "page" : undefined}
        onClick={() => setOpen(false)}
      >
        <Icon size={16} />
        <span>{label}</span>
        {href === "/reports" && saved > 0 && <span className="nav-count">{saved}</span>}
      </Link>
    ));
  }

  return (
    <>
      <header
        ref={header}
        className="site-header no-print"
        onBlur={(e) => {
          if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
      >
        <div className="shell header-inner">
          <Link href="/" aria-label="PropFirm Intelligence overview" onClick={() => setOpen(false)}>
            <Brand />
          </Link>
          <nav className="desktop-nav primary-links" aria-label="Primary">
            {navLinks()}
          </nav>
          <div className="header-controls">
            <Link
              href="/reports#workspace-profile"
              className="workspace-link"
              aria-label={name ? `${name}’s workspace` : "My workspace"}
              onClick={() => setOpen(false)}
            >
              <UserRound size={16} />
              <span>{name || "My workspace"}</span>
              <ArrowUpRight size={14} />
            </Link>
            <button
              ref={menuButton}
              type="button"
              className="menu-toggle"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close navigation" : "Open navigation"}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        <nav
          hidden={!open}
          id="mobile-nav"
          className="mobile-nav primary-links"
          aria-label="Mobile navigation"
        >
          {navLinks()}
        </nav>
      </header>
      <div className="shell context-bar no-print">
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <PanelsTopLeft size={14} />
          <Link href="/">Workspace</Link>
          <ChevronRight size={12} />
          <span aria-current="page">{current}</span>
        </nav>
        <div className="context-status">
          {trades > 0 && (
            <Link href="/history" className="linked-history">
              <Activity size={13} /> {trades} trades linked
            </Link>
          )}
          <span className="local-status">
            <i />
            Local workspace
          </span>
        </div>
      </div>
    </>
  );
}
