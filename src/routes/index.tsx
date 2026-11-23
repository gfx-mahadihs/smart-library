import { createFileRoute } from "@tanstack/react-router";
import { Explore } from "@/components/books/PublicCatalogueView";
import { publicCatalogueQuery } from "@/services/public-catalogue";
import { PublicLibraryLayout } from "@/components/layout/PublicLibraryLayout";
import { LoadingSkeleton, EmptyState } from "@/components/shared/states";
import { validateCatalogueSearch } from "@/services/catalogue-search";
import { CatalogueError } from "@/components/books/CatalogueError";
export const Route = createFileRoute("/")({
  validateSearch: validateCatalogueSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(publicCatalogueQuery),
  head: () => ({
    meta: [
      { title: "গ্রন্থাগার — Public Library Catalogue" },
      {
        name: "description",
        content:
          "Browse গ্রন্থাগার books, search authors and ISBNs, and check availability without signing in.",
      },
      { property: "og:title", content: "গ্রন্থাগার — Public Library Catalogue" },
      {
        property: "og:description",
        content: "Explore the library catalogue and discover your next book.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
  pendingComponent: () => (
    <PublicLibraryLayout>
      <LoadingSkeleton count={12} />
    </PublicLibraryLayout>
  ),
  errorComponent: CatalogueError,
  notFoundComponent: () => (
    <PublicLibraryLayout>
      <EmptyState title="Catalogue not found" />
    </PublicLibraryLayout>
  ),
});
