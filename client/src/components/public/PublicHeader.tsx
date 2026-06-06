import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MyBonds</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/bonds" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Bonds
          </Link>
          <a href="/#about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            About
          </a>
          <a href="/#contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </a>
        </nav>

        <Link href="/sign-in">
          <Button size="sm">Investor Login</Button>
        </Link>
      </div>
    </header>
  );
}
