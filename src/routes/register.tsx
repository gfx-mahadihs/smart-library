import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { AuthShell, GoogleButton } from "@/components/forms/AuthShell";

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

function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  return (
    <AuthShell muted="Create your" title="Library Account" compact>
      <div className="space-y-4">
        <GoogleButton label="Sign up with Google" />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">verified with Google</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Google verifies your identity. Existing student email and password login remains
          available.
        </p>
        <Button asChild variant="soft" size="xl">
          <Link to="/login">Log in with student email</Link>
        </Button>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-foreground hover:text-primary">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
