import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { OPERATOR } from "@shared/operator";

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Operator */}
          <div className="space-y-2">
            <h3 className="font-semibold">MyBonds</h3>
            <p className="text-sm text-muted-foreground">Operated by {OPERATOR.legalName}</p>
            <p className="text-sm text-muted-foreground">{OPERATOR.registrationNumber}</p>
            <p className="text-sm text-muted-foreground">DUNS: {OPERATOR.duns}</p>
            <p className="text-sm text-muted-foreground">{OPERATOR.fullAddress}</p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/bonds" className="text-muted-foreground transition-colors hover:text-foreground">Bonds</Link></li>
              <li><a href="/#contact" className="text-muted-foreground transition-colors hover:text-foreground">Request Information</a></li>
              <li><Link href="/sign-in" className="text-muted-foreground transition-colors hover:text-foreground">Investor Login</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/risk-disclosure" className="text-muted-foreground transition-colors hover:text-foreground">Risk Disclosure</Link></li>
              <li><Link href="/aml" className="text-muted-foreground transition-colors hover:text-foreground">AML Policy</Link></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="space-y-3 text-xs text-muted-foreground">
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
