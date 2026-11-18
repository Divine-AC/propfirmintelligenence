import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trade history" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
