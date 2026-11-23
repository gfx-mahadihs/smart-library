import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ handler: (fn: () => unknown) => fn }),
}));
import { fetchPublicCatalogue } from "@/services/public-catalogue.functions";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Public catalogue loading", () => {
  function emptyCatalogue() {
    const range = vi.fn().mockResolvedValue({ data: [], error: null });
    mocks.createClient.mockReturnValue({
      from: (table: string) => ({
        select: () => ({
          order: () => (table === "books" ? { range } : Promise.resolve({ data: [], error: null })),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
  }

  it("prefers the runtime configuration pair for SSR", async () => {
    emptyCatalogue();
    vi.stubEnv("SUPABASE_URL", "https://runtime.example");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    await expect(fetchPublicCatalogue()).resolves.toEqual({ books: [], categories: [] });
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://runtime.example",
      "sb_publishable_test",
      expect.objectContaining({
        auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      }),
    );
  });

  it("supports an external host with only public build configuration", async () => {
    emptyCatalogue();
    vi.stubEnv("SUPABASE_URL", undefined);
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", undefined);
    vi.stubEnv("VITE_SUPABASE_URL", "https://public.example");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_public_test");
    await expect(fetchPublicCatalogue()).resolves.toEqual({ books: [], categories: [] });
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://public.example",
      "sb_publishable_public_test",
      expect.anything(),
    );
  });
});
