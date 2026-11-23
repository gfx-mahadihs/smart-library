import type { ReactNode } from "react";
import { motion } from "motion/react";
import { BottomNavigation, DesktopNavigation, UserHeader } from "@/components/navigation/nav";
import { useRouterState } from "@tanstack/react-router";
import { PWAInstallPrompt } from "@/components/shared/PWAInstallPrompt";

export function AppLayout({ children }: { children: ReactNode }) {
  const inManagement = useRouterState({ select: (s) => s.location.pathname.startsWith("/admin") });
  if (inManagement) return <>{children}</>;
  return (
    <div className="min-h-screen bg-background">
      <DesktopNavigation />
      <UserHeader />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pb-32 sm:pt-6 md:pb-16 md:pt-10">
        {children}
      </main>
      <BottomNavigation />
      <PWAInstallPrompt />
    </div>
  );
}

/** Fade/slide used for every page body. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PageTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 className="title-lg break-words sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
