import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/register-validation";

describe("Google authentication integration", () => {
  it("uses native Supabase OAuth without Lovable", () => {
    const authShell = fs.readFileSync(path.resolve("src/components/forms/AuthShell.tsx"), "utf8");
    expect(authShell).toContain('provider: "google"');
    expect(authShell).toContain("/auth-callback");
    expect(authShell).not.toContain("lovable.");
  });

  it("exchanges OAuth callback codes and preserves email login", () => {
    const callback = fs.readFileSync(path.resolve("src/routes/auth-callback.tsx"), "utf8");
    const login = fs.readFileSync(path.resolve("src/routes/login.tsx"), "utf8");
    expect(callback).toContain("exchangeCodeForSession");
    expect(login).toContain("signInWithPassword");
  });

  it("uses register signUp and Google verification with email login", () => {
    const register = fs.readFileSync(path.resolve("src/routes/register.tsx"), "utf8");
    expect(register).toContain("signUp({");
    expect(register).toContain("emailRedirectTo:");
    expect(register).toContain("Sign up with Google");
    expect(register).toContain("Eye");
    expect(register).toContain("EyeOff");
  });

  it("validates mismatched passwords, weak passwords and missing student IDs", () => {
    expect(
      registerSchema.safeParse({
        fullName: "Ayesha Rahman",
        studentId: "",
        email: "ayesha@example.com",
        password: "password",
        confirmPassword: "password",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        fullName: "Ayesha Rahman",
        studentId: "2026-001",
        email: "ayesha@example.com",
        password: "Password1",
        confirmPassword: "Password2",
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        fullName: "Ayesha Rahman",
        studentId: "2026-001",
        email: "ayesha@example.com",
        password: "Password1",
        confirmPassword: "Password1",
      }).success,
    ).toBe(true);
  });

  it("configures Google provider through environment-backed values", () => {
    const config = fs.readFileSync(path.resolve("supabase/config.toml"), "utf8");
    expect(config).toContain("[auth.external.google]");
    expect(config).toContain("enabled = true");
    expect(config).toContain("SUPABASE_AUTH_GOOGLE_CLIENT_ID");
    expect(config).toContain("SUPABASE_AUTH_GOOGLE_SECRET");
  });
});
