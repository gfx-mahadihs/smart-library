import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { AuthShell, Field, GoogleButton, inputCls } from "@/components/forms/AuthShell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — গ্রন্থাগার" },
      { name: "description", content: "Sign in to your গ্রন্থাগার account." },
      { property: "og:title", content: "Log in to গ্রন্থাগার" },
      { property: "og:description", content: "A better way to explore books." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showEmail, setShowEmail] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(r.data);
    setBusy(false);
    if (error) {
      if (
        error.message.toLowerCase().includes("email not confirmed") ||
        error.code === "email_not_confirmed"
      ) {
        setUnverifiedEmail(r.data.email);
        setResendSeconds(60);
        toast.error("Please verify your email first");
        return;
      }
      toast.error(
        error.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : "Could not sign in. Please try again.",
      );
      return;
    }
    toast.success("Welcome back!");
  };

  const resendVerification = async () => {
    if (!unverifiedEmail || resendSeconds > 0) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: unverifiedEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth-callback` },
    });
    if (error) {
      toast.error("Could not resend verification email.");
      return;
    }
    setResendSeconds(60);
    toast.success("Verification email sent");
  };

  return (
    <AuthShell muted="A Better Way" title="to Explore Books">
      <AnimatePresence mode="wait">
        {!showEmail ? (
          <motion.div
            key="opts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <Button variant="hero" size="xl" onClick={() => setShowEmail(true)}>
              <Mail className="!size-5" /> Continue with Email
            </Button>
            <GoogleButton />
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            noValidate
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <Field id="email" label="Email" error={errors.email}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={inputCls}
                value={form.email}
                aria-invalid={!!errors.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@university.edu"
              />
            </Field>
            <Field id="password" label="Password" error={errors.password}>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`${inputCls} pr-12`}
                  value={form.password}
                  aria-invalid={!!errors.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            {unverifiedEmail && (
              <div className="rounded-2xl bg-primary-soft p-3 text-sm">
                <p className="font-semibold text-primary">Please verify your email first</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={resendVerification}
                  disabled={resendSeconds > 0}
                >
                  {resendSeconds > 0
                    ? `Resend email (${resendSeconds}s)`
                    : "Resend verification email"}
                </Button>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowEmail(false)}
                className="font-semibold text-muted-foreground hover:text-foreground"
              >
                ← Other options
              </button>
              <Link to="/forgot-password" className="font-semibold text-primary">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" variant="hero" size="xl" disabled={busy}>
              {busy ? "Signing in…" : "Log in"}
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <GoogleButton />
          </motion.form>
        )}
      </AnimatePresence>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/register" className="font-bold text-foreground hover:text-primary">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
