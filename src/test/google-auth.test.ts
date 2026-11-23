import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Google authentication integration", () => {
  it("uses Supabase OAuth instead of the Lovable bridge", () => {
    const authShell = fs.readFileSync(path.resolve("src/components/forms/AuthShell.tsx"), "utf8");
    expect(authShell).toContain('provider: "google"');
    expect(authShell).toContain("/auth-callback");
    expect(authShell).not.toContain("lovable.auth.signInWithOAuth");
  });

  it("exchanges OAuth callback codes and preserves email login", () => {
    const callback = fs.readFileSync(path.resolve("src/routes/auth-callback.tsx"), "utf8");
    const login = fs.readFileSync(path.resolve("src/routes/login.tsx"), "utf8");
    expect(callback).toContain("exchangeCodeForSession");
    expect(login).toContain("signInWithPassword");
  });

  it("configures Google provider through environment-backed values", () => {
    const config = fs.readFileSync(path.resolve("supabase/config.toml"), "utf8");
    expect(config).toContain("[auth.external.google]");
    expect(config).toContain("enabled = true");
    expect(config).toContain("SUPABASE_AUTH_GOOGLE_CLIENT_ID");
    expect(config).toContain("SUPABASE_AUTH_GOOGLE_SECRET");
  });
});
