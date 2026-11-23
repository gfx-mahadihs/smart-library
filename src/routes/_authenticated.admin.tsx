import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { library } from "@/services";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { canEnterManagement } from "@/lib/management";
export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const access = await library.managementAccess();
      if (!canEnterManagement(access)) throw new Error("Access denied");
      return { access };
    } catch {
      throw redirect({ to: "/profile", replace: true });
    }
  },
  component: AdminLayout,
});
function AdminLayout() {
  const { access } = Route.useRouteContext();
  const { signOut } = useAuth();
  const links = [
    { to: "/admin", label: "Overview", show: true },
    { to: "/admin/books", label: "Catalogue", show: access.admin },
    { to: "/admin/categories", label: "Categories", show: access.admin },
    { to: "/admin/authors", label: "Authors", show: access.admin },
    { to: "/admin/users", label: "Members", show: access.admin },
    { to: "/admin/circulation", label: "Circulation", show: true },
    { to: "/admin/super-admin", label: "Super admin", show: access.superAdmin },
    { to: "/admin/notices", label: "Notices", show: access.admin },
    { to: "/admin/reports", label: "Reports", show: access.admin },
  ] as const;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo />
            <span className="flex items-center gap-1 rounded-full bg-lime px-2.5 py-0.5 text-[11px] font-bold sm:px-3 sm:py-1 sm:text-xs">
              <ShieldCheck className="size-3" />
              {access.superAdmin ? "Super admin" : access.admin ? "Admin" : "Librarian"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft />
                <span className="hidden sm:inline">Back to library</span>
                <span className="sm:hidden">Library</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
        <nav
          aria-label="Administration"
          className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6"
        >
          {links
            .filter((l) => l.show)
            .map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/admin" }}
                className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold"
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:bg-muted" }}
              >
                {l.label}
              </Link>
            ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
