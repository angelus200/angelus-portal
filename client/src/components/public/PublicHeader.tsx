import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { BRAND } from "@shared/brand";

const isKG = BRAND.key === "angelus";

const cfg = isKG
  ? {
      brandA: "Angelus", brandB: " KG",
      nav: [["/bonds", "Anleihen"], ["/#calculator", "Rechner"], ["/#contact", "Kontakt"]] as const,
      login: "Investor-Login",
    }
  : {
      brandA: "My", brandB: "Bonds",
      nav: [["/bonds", "Bonds"], ["/#calculator", "Calculator"], ["/#about", "About"], ["/#contact", "Contact"]] as const,
      login: "Investor Login",
    };

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 text-slate-950">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            {cfg.brandA}<span className="text-amber-400">{cfg.brandB}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {cfg.nav.map(([href, label]) =>
            href.startsWith("/#") ? (
              <a key={href} href={href} className="text-sm text-slate-300 transition-colors hover:text-white">{label}</a>
            ) : (
              <Link key={href} href={href} className="text-sm text-slate-300 transition-colors hover:text-white">{label}</Link>
            )
          )}
        </nav>

        <Link href="/sign-in">
          <Button size="sm" className="bg-amber-500 text-slate-950 hover:bg-amber-400">
            {cfg.login}
          </Button>
        </Link>
      </div>
    </header>
  );
}
