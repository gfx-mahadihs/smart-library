import { z } from "zod";

export const catalogueSearchSchema = z.object({
  q: z.string().max(100).optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  author: z.string().optional().catch(undefined),
  language: z.string().optional().catch(undefined),
  year: z.coerce.number().int().positive().optional().catch(undefined),
  availableOnly: z.preprocess(
    (value) => (value === true || value === "true" ? true : undefined),
    z.boolean().optional(),
  ),
  sort: z.enum(["popular", "recent", "title", "rating", "author"]).optional().catch(undefined),
});

export const validateCatalogueSearch = (search: Record<string, unknown>) =>
  catalogueSearchSchema.parse(search);
