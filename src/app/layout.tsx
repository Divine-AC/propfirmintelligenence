import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "./globals.css";
import "./research.css";

export const metadata: Metadata = {
  title: { default: "PropFirm Intelligence · Research workspace", template: "%s · PropFirm Intelligence" },
  description: "Match your trading strategy to prop firm accounts, compare researched rules, and analyze your closed trades in a local-first workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Navbar />
        <div id="main-content" tabIndex={-1} className="content-area">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
