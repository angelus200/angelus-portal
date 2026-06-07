import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { OPERATOR } from "@shared/operator";

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-slate-950 text-slate-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Operator */}
          <div className="space-y-2">
            <h3 className="font-semibold text-white">
              My<span className="text-amber-400">Bonds</span>
            </h3>
            <p className="text-sm text-slate-400">Operated by {OPERATOR.legalName}</p>
            <p className="text-sm text-slate-400">{OPERATOR.registrationNumber}</p>
            <p className="text-sm text-slate-400">DUNS: {OPERATOR.duns}</p>
            <p className="text-sm text-slate-400">{OPERATOR.fullAddress}</p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/bonds" className="text-slate-400 transition-colors hover:text-white">Bonds</Link></li>
              <li><a href="/#calculator" className="text-slate-400 transition-colors hover:text-white">Income Calculator</a></li>
              <li><a href="/#contact" className="text-slate-400 transition-colors hover:text-white">Request Information</a></li>
              <li><Link href="/sign-in" className="text-slate-400 transition-colors hover:text-white">Investor Login</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-white">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-slate-400 transition-colors hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/risk-disclosure" className="text-slate-400 transition-colors hover:text-white">Risk Disclosure</Link></li>
              <li><Link href="/aml" className="text-slate-400 transition-colors hover:text-white">AML Policy</Link></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-white/10" />

        <div className="space-y-3 text-xs text-slate-500">
          <p>
            Offers on this site are directed exclusively at legal entities — corporations, family offices
            and institutional investors. Not available to natural persons / retail investors.
          </p>
          <p>
            Capital at risk. Bonds are intended for professional and semi-professional investors only.
            Past performance is not indicative of future results.
          </p>
          <p>© {currentYear} {OPERATOR.legalName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
