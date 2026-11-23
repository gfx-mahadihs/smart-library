import { createFileRoute } from "@tanstack/react-router";
import { Explore } from "@/components/books/PublicCatalogueView";
import { publicCatalogueQuery } from "@/services/public-catalogue";
import { PublicLibraryLayout } from "@/components/layout/PublicLibraryLayout";
import { EmptyState, LoadingSkeleton } from "@/components/shared/states";
import { validateCatalogueSearch } from "@/services/catalogue-search";
import { CatalogueError } from "@/components/books/CatalogueError";

export const Route = createFileRoute("/explore")({
  validateSearch: validateCatalogueSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(publicCatalogueQuery),
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
  head: () => ({
    meta: [
      { title: "Explore Books — গ্রন্থাগার" },
      {
        name: "description",
        content: "Search the catalogue by title, author, ISBN, category or department.",
      },
      { property: "og:title", content: "Explore Books — গ্রন্থাগার" },
      { property: "og:description", content: "Discover your next great read." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});
