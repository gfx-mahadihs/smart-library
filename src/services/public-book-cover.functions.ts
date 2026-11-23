import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const resolvePublicBookCover = createServerFn({ method: "GET" })
  .validator(
    z.object({
      reference: z
        .string()
        .max(240)
        .regex(/^storage:\/\/book-covers\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i),
    }),
  )
  .handler(async ({ data }) => {
    const buildUrl = import.meta.env["VITE_SUPABASE_URL"];
    const buildKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    const runtimeConfigured =
      process.env["SUPABASE_URL"] && process.env["SUPABASE_PUBLISHABLE_KEY"];
    const preferBuildConfig = process.env["VERCEL"] === "1" && buildUrl && buildKey;
    const url = preferBuildConfig
      ? buildUrl
      : runtimeConfigured
        ? process.env["SUPABASE_URL"]
        : buildUrl;
    const key = preferBuildConfig
      ? buildKey
      : runtimeConfigured
        ? process.env["SUPABASE_PUBLISHABLE_KEY"]
        : buildKey;
    if (!url || !key) throw new Error("Book cover is unavailable.");
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(input instanceof Request ? input.headers : undefined);
          new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
            headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    // Authorize this exact object through the public catalogue's RLS before
    // using privileged storage signing. Never sign caller-selected raw paths.
    const book = await client.from("books").select("id").eq("cover_url", data.reference).limit(1);
    if (book.error || !book.data?.length) throw new Error("Book cover is unavailable.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = await supabaseAdmin.storage
      .from("book-covers")
      .createSignedUrl(data.reference.slice("storage://book-covers/".length), 300);
    if (signed.error || !signed.data?.signedUrl) throw new Error("Book cover is unavailable.");
    // The runtime database address may be private; return only the public
    // browser origin with the Storage API's signed path and token.
    const browserUrl = import.meta.env["VITE_SUPABASE_URL"];
    if (!browserUrl) throw new Error("Book cover is unavailable.");
    const signedUrl = new URL(signed.data.signedUrl);
    return new URL(signedUrl.pathname + signedUrl.search, browserUrl).href;
  });
