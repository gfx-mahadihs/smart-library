import { Search } from "lucide-react";
import { useState } from "react";
import type { Book, BookFilters, Category } from "@/types/library";
import { filterCatalogue } from "@/services/catalogue";
import { Chip, FilterPanel, SearchBar } from "./SearchFilters";
import { EmptyState } from "@/components/shared/states";
import { cn } from "@/lib/utils";
import { bookCornerImages } from "@/data/bookCornerImages";
import { InteractiveBookshelf } from "@/components/books/InteractiveBookshelf";

type CornerImage = { id: string; image: string; alt: string; title?: string };

function EditorialImage({ image, className }: { image: CornerImage; className?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-[#e6e5df]", className)}>
      {failed ? (
        <div className="absolute inset-0 bg-gradient-to-br from-[#d6d9cd] via-[#eeeee9] to-[#aeb9bd]" />
      ) : (
        <img
          src={image.image}
          alt={image.alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
    </div>
  );
}

function RuleLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-y border-[#111827]/25 py-2 dark:border-white/25">
      <h1 className="font-serif text-sm font-medium tracking-[-0.02em]">{children}</h1>
    </div>
  );
}

function ResultList({ books }: { books: Book[] }) {
  if (!books.length) {
    return (
      <EmptyState title="Nothing found yet" description="Try another title, author, or category." />
    );
  }

  return (
    <div className="divide-y divide-[#111827]/15 border-y border-[#111827]/20 dark:divide-white/15 dark:border-white/20">
      {books.map((book) => (
        <div
          key={book.id}
          className="grid gap-1 py-3 text-xs sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-4"
        >
          <p className="font-medium">{book.title}</p>
          <p className="text-[#111827]/60 dark:text-white/60">
            {book.authors.join(", ")} · {book.category?.name ?? "Uncategorised"}
          </p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#111827]/50 dark:text-white/50">
            {book.availableCopies > 0
              ? `${book.availableCopies} available`
              : "Currently unavailable"}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BookCorner({
  books,
  categories,
  filters,
  onChange,
  mode = "explore",
}: {
  books: Book[];
  categories: Category[];
  filters: BookFilters;
  onChange: (patch: Partial<BookFilters>) => void;
  mode?: "explore" | "search";
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filteredBooks = filterCatalogue(books, filters);
  const authors = [...new Set(books.flatMap((book) => book.authors))].sort();
  const languages = [...new Set(books.map((book) => book.language))].sort();
  const years = [
    ...new Set(books.map((book) => book.publicationYear).filter(Boolean) as number[]),
  ].sort((a, b) => b - a);
  const isFiltered = Boolean(
    filters.q ||
    filters.category ||
    filters.author ||
    filters.language ||
    filters.year ||
    filters.availableOnly,
  );

  return (
    <div className="mx-auto max-w-[1180px]">
      <RuleLabel>Book Corner</RuleLabel>
      <p className="max-w-3xl border-b border-[#111827]/25 py-3 text-[10px] leading-4 text-[#111827]/70 dark:border-white/25 dark:text-white/70 sm:text-[11px]">
        A small collection of carefully selected books and visual references for people who enjoy
        thoughtful spaces, useful ideas, and beautiful things.
      </p>

      <div className="py-4">
        <InteractiveBookshelf
          books={books}
          categories={categories}
          initialCategory={filters.category}
          title="Virtual Curated Bookshelf"
          subtitle="Explore volumes on physical shelves. Click any book spine to inspect publication details and preview the opening pages."
        />
      </div>

      <section className="border-t border-[#111827]/25 pt-5 dark:border-white/25">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-lg">
              {mode === "search" ? "Search the collection" : "Find a book"}
            </p>
            <p className="mt-1 text-[10px] text-[#111827]/60 dark:text-white/60">
              {isFiltered ? `${filteredBooks.length} matching titles` : `${books.length} titles`}
            </p>
          </div>
          <div className="w-full sm:max-w-md">
            <div className="flex items-center gap-2">
              <Search className="size-3.5 text-[#111827]/55 dark:text-white/55" />
              <SearchBar
                value={filters.q ?? ""}
                onChange={(q) => onChange({ q: q.slice(0, 100) || undefined })}
                onToggleFilters={() => setFiltersOpen((open) => !open)}
                filtersOpen={filtersOpen}
              />
            </div>
            <FilterPanel
              open={filtersOpen}
              filters={filters}
              categories={categories}
              authors={authors}
              languages={languages}
              years={years}
              onChange={onChange}
            />
            <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
              <Chip active={!filters.category} onClick={() => onChange({ category: undefined })}>
                All
              </Chip>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  active={filters.category === category.slug}
                  onClick={() => onChange({ category: category.slug })}
                >
                  {category.name}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6">
          <ResultList books={filteredBooks} />
        </div>
      </section>
    </div>
  );
}
