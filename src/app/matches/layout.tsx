import type { Metadata } from "next";

export const metadata: Metadata = { title: "Strategy matcher" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
