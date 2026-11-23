import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { AppLayout } from "./AppLayout";

export function PublicLibraryLayout({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "book-corner";
}) {
  const { user } = useAuth();
  if (user) return <AppLayout>{children}</AppLayout>;
  if (variant === "book-corner") {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#f7f7f5] text-[#111827]">
        <header className="border-b border-[#111827]/20">
          <div className="mx-auto flex min-h-11 max-w-[1440px] items-center justify-between px-5 sm:px-8">
            <Link
              to="/"
              aria-label="Time and Space home"
              className="font-serif text-[11px] font-semibold tracking-[-0.03em]"
            >
              time &amp; space.
            </Link>
            <nav aria-label="Book Corner" className="flex items-center gap-4 text-[9px]">
              <Link to="/explore" className="transition-opacity hover:opacity-50">
                Book Corner
              </Link>
              <Link to="/book-search" className="transition-opacity hover:opacity-50">
                Search
              </Link>
              <ThemeToggle className="size-7 border-0 bg-transparent" />
              <Link to="/login" className="transition-opacity hover:opacity-50">
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full border border-current px-2 py-1 font-semibold"
              >
                Sign up
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8 sm:py-7">{children}</main>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:min-h-20">
          <Link to="/" aria-label="গ্রন্থাগার home">
            <Logo />
          </Link>
          <nav aria-label="Public library" className="flex items-center gap-1.5 sm:gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/explore">Explore</Link>
            </Button>
            <ThemeToggle />
            <Button asChild variant="soft" size="sm">
              <Link to="/register">Sign up</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login">
                <LogIn className="size-4" />
                Login
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-10">{children}</main>
    </div>
  );
}
