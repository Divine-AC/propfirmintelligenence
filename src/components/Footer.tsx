import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandMark } from "./Brand";

export function Footer() {
  return (
    <footer className="site-footer no-print">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <BrandMark size={26} />
          <strong>PropFirm Intelligence</strong>
        </div>
        <p>
          Research is a starting point, not a guarantee of passing or receiving a payout. Verify current terms
          with the firm before purchasing.
        </p>
        <Link href="/reports">
          <ShieldCheck size={15} /> Local-first workspace
        </Link>
      </div>
    </footer>
  );
}
