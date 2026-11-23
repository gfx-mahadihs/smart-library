import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("library upgrade migration security", () => {
  const migrations = [
    "0011_retention_engagement_access.sql",
    "0012_waitlist_triggers_reports_search.sql",
    "0013_audit_notices_waitlist_cron.sql",
  ].map((name) => fs.readFileSync(path.resolve("drizzle/migrations", name), "utf8"));
  const combined = migrations.join("\n");

  it("enables RLS on all new member and engagement tables", () => {
    for (const table of [
      "waitlist",
      "book_reviews",
      "reading_lists",
      "reading_list_items",
      "library_notices",
    ]) {
      expect(combined).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it("keeps upgrade mutations behind security-definer RPCs", () => {
    for (const rpc of [
      "renew_loan",
      "join_waitlist",
      "leave_waitlist",
      "save_book_review",
      "staff_waive_fine",
      "admin_reports",
    ]) {
      expect(combined).toContain(`FUNCTION public.${rpc}`);
      expect(combined).toContain("SECURITY DEFINER");
    }
  });

  it("does not grant anonymous access to waitlist or review mutations", () => {
    expect(combined).not.toContain("GRANT ALL ON public.waitlist TO anon");
    expect(combined).not.toContain("GRANT ALL ON public.book_reviews TO anon");
  });
});
