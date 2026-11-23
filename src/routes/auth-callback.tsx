import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState(
    () => sessionStorage.getItem("library_verification_email") ?? "",
  );
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const recovery = url.searchParams.get("type") === "recovery";
    const code = url.searchParams.get("code");
    const tokenHash = url.searchParams.get("token_hash");
    const verificationType = url.searchParams.get("type");
    let cancelled = false;
    let attempts = 0;

    const exchangeCode = async () => {
      const existing = await supabase.auth.getSession();
      if (existing.data.session) return true;
      if (tokenHash) {
        const type =
          verificationType === "recovery"
            ? "recovery"
            : verificationType === "email_change"
              ? "email_change"
              : "signup";
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
        if (error) {
          setStatus("error");
          setErrorMessage(
            error.message.toLowerCase().includes("expired")
              ? "This verification link has expired."
              : "This verification link is invalid.",
          );
          return false;
        }
        return true;
      }
      if (!code) {
        setStatus("error");
        setErrorMessage("No verification details were found in this link.");
        return false;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setStatus("error");
        setErrorMessage(
          error.message.toLowerCase().includes("expired")
            ? "This verification link has expired."
            : "This verification link is invalid.",
        );
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
        if (recovery) {
          navigate({ to: "/reset-password", replace: true });
        } else {
          setStatus("success");
          window.setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1200);
        }
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
      if (recovery) {
        navigate({ to: "/reset-password", replace: true });
      } else if (code || tokenHash || url.hash) {
        setStatus("success");
        window.setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1200);
      } else {
        navigate({ to: "/dashboard", replace: true });
      }
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

  const resendVerification = async () => {
    if (!email || resendSeconds > 0) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth-callback` },
    });
    if (error) {
      setErrorMessage("Could not resend the verification email.");
      return;
    }
    setResendSeconds(60);
  };

  if (status === "success") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-lime text-lime-foreground">
            ✓
          </div>
          <h1 className="text-xl font-extrabold">Email verified, welcome!</h1>
          <p className="mt-2 text-sm text-muted-foreground">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl bg-card p-6 text-center shadow-soft">
          <h1 className="text-xl font-extrabold">Verification could not be completed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          <div className="mt-4 space-y-3">
            <input
              type="email"
              aria-label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-2xl border bg-background px-4 text-sm"
              placeholder="you@university.edu"
            />
            <button
              type="button"
              disabled={!email || resendSeconds > 0}
              onClick={resendVerification}
              className="h-12 w-full rounded-2xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {resendSeconds > 0 ? `Resend email (${resendSeconds}s)` : "Resend verification email"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/login", replace: true })}
              className="text-sm font-semibold text-primary"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
