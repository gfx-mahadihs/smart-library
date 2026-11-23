import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth-callback")({
  component: AuthCallback,
});

/**
 * Landing route after Supabase OAuth / magic-link redirects.
 * Supabase appends `code` and `state` as query params; the client SDK
 * exchanges them for a session automatically via onAuthStateChange.
 * We just wait for the session and redirect accordingly.
 */
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const recovery = url.searchParams.get("type") === "recovery";
    const code = url.searchParams.get("code");
    let cancelled = false;
    let attempts = 0;

    const exchangeCode = async () => {
      if (!code) return true;
      const existing = await supabase.auth.getSession();
      if (existing.data.session) return true;
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[auth-callback] OAuth code exchange failed:", error.message);
        return false;
      }
      return true;
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        sub.subscription.unsubscribe();
        navigate({ to: "/reset-password", replace: true });
      } else if (event === "SIGNED_IN" && session) {
        sub.subscription.unsubscribe();
        navigate({ to: recovery ? "/reset-password" : "/dashboard", replace: true });
      }
    });

    const finish = async () => {
      if (cancelled) return;
      attempts += 1;
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error || !data.session) {
        if (error) console.error("[auth-callback] session could not be restored:", error.message);
        if (attempts >= 3) navigate({ to: "/login", replace: true });
        return;
      }
      navigate({ to: recovery ? "/reset-password" : "/dashboard", replace: true });
    };

    void exchangeCode().then((exchanged) => {
      if (!exchanged) {
        navigate({ to: "/login", replace: true });
        return;
      }
      void finish();
    });
    const fallback = window.setTimeout(() => void finish(), 2500);
    const finalFallback = window.setTimeout(() => void finish(), 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      window.clearTimeout(finalFallback);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
