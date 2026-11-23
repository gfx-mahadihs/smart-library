import { describe, expect, it } from "vitest";
import { validateCatalogueSearch } from "@/services/catalogue-search";

describe("Catalogue URL filters", () => {
  it("retains search and sort together", () => {
    expect(validateCatalogueSearch({ q: "Clean Code", sort: "title" })).toEqual({
      q: "Clean Code",
      sort: "title",
      availableOnly: undefined,
    });
  });
  it("parses shared availability and year filters", () => {
    expect(validateCatalogueSearch({ year: "2008", availableOnly: "true" })).toMatchObject({
      year: 2008,
      availableOnly: true,
    });
  });
  it("discards invalid year and sort instead of breaking browsing", () => {
    expect(
      validateCatalogueSearch({ year: "Infinity", sort: "invalid", availableOnly: "false" }),
    ).toEqual({ year: undefined, sort: undefined, availableOnly: undefined });
  });
});
