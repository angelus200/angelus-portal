import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 text-slate-950">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            My<span className="text-amber-400">Bonds</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/bonds" className="text-sm text-slate-300 transition-colors hover:text-white">
            Bonds
          </Link>
          <a href="/#calculator" className="text-sm text-slate-300 transition-colors hover:text-white">
            Calculator
          </a>
          <a href="/#about" className="text-sm text-slate-300 transition-colors hover:text-white">
            About
          </a>
          <a href="/#contact" className="text-sm text-slate-300 transition-colors hover:text-white">
            Contact
          </a>
        </nav>

        <Link href="/sign-in">
          <Button size="sm" className="bg-amber-500 text-slate-950 hover:bg-amber-400">
            Investor Login
          </Button>
        </Link>
      </div>
    </header>
  );
}
