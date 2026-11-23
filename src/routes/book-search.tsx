import { createFileRoute } from "@tanstack/react-router";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BookCorner } from "@/components/books/BookCorner";
import { CatalogueError } from "@/components/books/CatalogueError";
import { LoadingSkeleton, EmptyState } from "@/components/shared/states";
import { Page } from "@/components/layout/AppLayout";
import { PublicLibraryLayout } from "@/components/layout/PublicLibraryLayout";
import { publicCatalogueQuery } from "@/services/public-catalogue";
import { validateCatalogueSearch } from "@/services/catalogue-search";
import type { BookFilters } from "@/types/library";

export const Route = createFileRoute("/book-search")({
  validateSearch: validateCatalogueSearch,
  loader: ({ context }) => context.queryClient.ensureQueryData(publicCatalogueQuery),
  pendingComponent: () => (
    <PublicLibraryLayout variant="book-corner">
      <LoadingSkeleton count={12} />
    </PublicLibraryLayout>
  ),
  errorComponent: CatalogueError,
  notFoundComponent: () => (
    <PublicLibraryLayout variant="book-corner">
      <EmptyState title="Search not found" />
    </PublicLibraryLayout>
  ),
  head: () => ({
    meta: [
      { title: "Book Search — গ্রন্থাগার" },
      {
        name: "description",
        content: "Search the Book Corner collection by title, author, ISBN, or category.",
      },
    ],
  }),
  component: BookSearch,
});

function BookSearch() {
  const filters: BookFilters = useSearch({ strict: false });
  const navigate = useNavigate();
  const { data: catalogue } = useSuspenseQuery(publicCatalogueQuery);

  return (
    <PublicLibraryLayout variant="book-corner">
      <Page>
        <BookCorner
          books={catalogue.books}
          categories={catalogue.categories}
          filters={filters}
          onChange={(patch) =>
            void navigate({
              to: "/book-search",
              search: (previous) => ({ ...previous, ...patch }),
              replace: true,
            })
          }
          mode="search"
        />
      </Page>
    </PublicLibraryLayout>
  );
}
