import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { AuthShell, Field, GoogleButton, inputCls } from "@/components/forms/AuthShell";
import { registerSchema } from "@/lib/register-validation";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — গ্রন্থাগার" },
      { name: "description", content: "Join গ্রন্থাগার to reserve books and track due dates." },
      { property: "og:title", content: "Join গ্রন্থাগার" },
      {
        property: "og:description",
        content: "Reserve books, track due dates, and manage your library activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Register,
});

type RegisterForm = z.input<typeof registerSchema>;

function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>({
    fullName: "",
    studentId: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const set = (key: keyof RegisterForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const resendEmail = async () => {
    if (!sentTo || resendSeconds > 0) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sentTo,
      options: {
        emailRedirectTo: `${window.location.origin}/auth-callback`,
      },
    });
    if (error) {
      toast.error(
        error.message === "For security purposes"
          ? "Please wait before resending."
          : "Could not resend verification email.",
      );
      return;
    }
    setResendSeconds(60);
    toast.success("Verification email sent");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = registerSchema.safeParse(form);
    if (!result.success) {
      setErrors(
        Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth-callback`,
        data: {
          full_name: result.data.fullName,
          student_id: result.data.studentId,
        },
      },
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        toast.error("An account with this email already exists.");
      } else {
        toast.error("Could not create account. Please try again.");
      }
      return;
    }
    // Confirm-email is enabled by the dashboard; never treat signUp as a verified login.
    sessionStorage.setItem("library_verification_email", result.data.email);
    setSentTo(result.data.email);
    setResendSeconds(60);
  };

  if (sentTo) {
    return (
      <AuthShell muted="Almost there" title="Check your inbox" compact>
        <p className="text-center text-sm text-muted-foreground">
          We sent a confirmation link to <b className="text-foreground">{sentTo}</b>. Click it to
          complete your registration.
        </p>
        <div className="mt-4 space-y-3">
          <Button
            type="button"
            variant="hero"
            size="xl"
            onClick={resendEmail}
            disabled={resendSeconds > 0}
          >
            {resendSeconds > 0 ? `Resend email (${resendSeconds}s)` : "Resend email"}
          </Button>
          <Button
            type="button"
            variant="soft"
            size="xl"
            onClick={() => {
              sessionStorage.removeItem("library_verification_email");
              setSentTo(null);
              setResendSeconds(0);
            }}
          >
            Use a different email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell muted="Create your" title="Library Account" compact>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="fullName" label="Full name" error={errors.fullName}>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            className={inputCls}
            value={form.fullName}
            aria-invalid={!!errors.fullName}
            onChange={set("fullName")}
            placeholder="Ayesha Rahman"
          />
        </Field>
        <Field id="studentId" label="Student ID" error={errors.studentId}>
          <input
            id="studentId"
            type="text"
            autoComplete="off"
            className={inputCls}
            value={form.studentId}
            aria-invalid={!!errors.studentId}
            onChange={set("studentId")}
            placeholder="2026-1-60-001"
          />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={inputCls}
            value={form.email}
            aria-invalid={!!errors.email}
            onChange={set("email")}
            placeholder="you@university.edu or Gmail"
          />
        </Field>
        <Field id="password" label="Password" error={errors.password}>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className={`${inputCls} pr-12`}
              value={form.password}
              aria-invalid={!!errors.password}
              onChange={set("password")}
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
        <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              className={`${inputCls} pr-12`}
              value={form.confirmPassword}
              aria-invalid={!!errors.confirmPassword}
              onChange={set("confirmPassword")}
              placeholder="••••••••"
            />
            <button
              type="button"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setShowConfirm((value) => !value)}
              className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" variant="hero" size="xl" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <div className="mt-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton label="Sign up with Google" />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-foreground hover:text-primary">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
