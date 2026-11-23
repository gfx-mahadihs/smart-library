import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn(), sign: vi.fn(), adminLoad: vi.fn() }));
vi.mock("@tanstack/react-start", () => {
  const makeValidator = (schema: { parse: (v: unknown) => unknown }) => ({
    handler: (fn: (v: unknown) => unknown) => (args: { data: unknown }) =>
      fn({ data: schema.parse(args.data) }),
  });
  return {
    createServerFn: () => ({
      validator: makeValidator,
      inputValidator: makeValidator,
    }),
  };
});
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ limit: mocks.select }) }) }),
  }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    storage: {
      from: (bucket: string) => {
        mocks.adminLoad(bucket);
        return { createSignedUrl: mocks.sign };
      },
    },
  },
}));
import { resolvePublicBookCover } from "@/services/public-book-cover.functions";

const reference =
  "storage://book-covers/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg";
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("Public book cover authorization", () => {
  function configure() {
    vi.stubEnv("SUPABASE_URL", "https://internal.example");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("VITE_SUPABASE_URL", "https://browser.example");
  }
  it("rejects arbitrary storage paths before querying or signing", async () => {
    configure();
    expect(() =>
      resolvePublicBookCover({ data: { reference: "storage://book-covers/../private.txt" } }),
    ).toThrow();
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("never signs a cover not referenced by a visible book", async () => {
    configure();
    mocks.select.mockResolvedValue({ data: [], error: null });
    await expect(resolvePublicBookCover({ data: { reference } })).rejects.toThrow(
      "Book cover is unavailable.",
    );
    expect(mocks.adminLoad).not.toHaveBeenCalled();
  });
  it("fails closed when catalogue verification fails", async () => {
    configure();
    mocks.select.mockResolvedValue({ data: null, error: { message: "private detail" } });
    await expect(resolvePublicBookCover({ data: { reference } })).rejects.toThrow(
      "Book cover is unavailable.",
    );
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("signs only the approved object for five minutes on the public origin", async () => {
    configure();
    mocks.select.mockResolvedValue({ data: [{ id: "book" }], error: null });
    mocks.sign.mockResolvedValue({
      data: {
        signedUrl:
          "https://internal.example/storage/v1/object/sign/book-covers/cover.jpg?token=test",
      },
      error: null,
    });
    await expect(resolvePublicBookCover({ data: { reference } })).resolves.toBe(
      "https://browser.example/storage/v1/object/sign/book-covers/cover.jpg?token=test",
    );
    expect(mocks.sign).toHaveBeenCalledWith(reference.slice("storage://book-covers/".length), 300);
  });
});
