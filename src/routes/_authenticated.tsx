import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Logo } from "@/components/shared/Logo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <Logo className="animate-pulse" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (!user.email_confirmed_at && !user.confirmed_at) {
    return <Navigate to="/login" search={{ verify: "1" }} replace />;
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
