import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, BookOpen, X, ArrowRight, Sparkles } from "lucide-react";
import type { Book, Category } from "@/types/library";
import { getBookSpineStyle } from "@/data/bookSpinesAndPages";
import { BookCover } from "@/components/books/BookCover";
import { BookPageReader } from "@/components/books/BookPageReader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  books: Book[];
  categories?: Category[];
  initialCategory?: string;
  title?: string;
  subtitle?: string;
}

export function InteractiveBookshelf({
  books,
  categories = [],
  initialCategory,
  title = "Curated Library Shelf",
  subtitle = "An ever-evolving collection of classic and modern works spanning science, technology, mathematics, literature, and business.",
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [readerBook, setReaderBook] = useState<Book | null>(null);

  // Compute category list from books if not passed
  const allCategories = categories.length
    ? categories
    : Array.from(
        new Map(
          books.filter((b) => b.category).map((b) => [b.category!.slug, b.category!]),
        ).values(),
      );

  // Filter books by category and search query
  const filteredBooks = books.filter((book) => {
    const matchesCategory =
      !selectedCategory ||
      book.category?.slug.toLowerCase() === selectedCategory.toLowerCase() ||
      book.category?.name.toLowerCase() === selectedCategory.toLowerCase();

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      book.title.toLowerCase().includes(q) ||
      book.authors.some((a) => a.toLowerCase().includes(q)) ||
      book.isbn.toLowerCase().includes(q) ||
      (book.description && book.description.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  const activeBook = filteredBooks.find((b) => b.id === activeBookId) ?? null;

  return (
    <section className="my-8 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40 sm:p-8">
      {/* Editorial Header (inspired by time & space reference) */}
      <div className="border-b border-neutral-300 pb-4 dark:border-neutral-700">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#8b5e3c] dark:text-[#d1a075]" />
            <h2 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
              {title}
            </h2>
          </div>
          <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
            {filteredBooks.length} {filteredBooks.length === 1 ? "volume" : "volumes"} on shelf
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-sm">
          {subtitle}
        </p>
      </div>

      {/* Filter and Search Controls */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="no-scrollbar flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => {
              setSelectedCategory(undefined);
              setActiveBookId(null);
            }}
            className={cn(
              "rounded-full px-3 py-1 font-mono text-xs transition-colors",
              !selectedCategory
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold"
                : "bg-neutral-200/70 text-neutral-700 hover:bg-neutral-300/80 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
            )}
          >
            All Categories
          </button>
          {allCategories.map((cat) => {
            const isSelected =
              selectedCategory?.toLowerCase() === cat.slug.toLowerCase() ||
              selectedCategory?.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.id || cat.slug}
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  setActiveBookId(null);
                }}
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-xs transition-colors",
                  isSelected
                    ? "bg-[#14213D] text-white ring-2 ring-lime dark:bg-lime dark:text-ink font-semibold"
                    : "bg-neutral-200/70 text-neutral-700 hover:bg-neutral-300/80 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
                )}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div className="relative min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search shelf titles, authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
      </div>

      {/* The Physical Bookshelf Container */}
      <div className="relative mt-8 min-h-[360px] overflow-hidden rounded-xl bg-gradient-to-b from-[#e8e4dc] to-[#ded8cc] p-4 shadow-inner dark:from-[#1b1c20] dark:to-[#141416] sm:p-6">
        {filteredBooks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <BookOpen className="size-10 text-neutral-400" />
            <p className="mt-2 font-serif text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              No volumes found in this category
            </p>
            <p className="text-xs text-neutral-500">
              Try switching category or clearing the search query.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-full text-xs"
              onClick={() => {
                setSelectedCategory(undefined);
                setSearchQuery("");
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="no-scrollbar flex items-end gap-1.5 overflow-x-auto pb-4 pt-6 sm:gap-2">
            {filteredBooks.map((book, idx) => {
              const spine = getBookSpineStyle(book, idx);
              const isSelected = activeBookId === book.id;

              return (
                <div key={book.id} className="flex shrink-0 items-end">
                  {/* Standing Book Spine */}
                  <button
                    type="button"
                    onClick={() => setActiveBookId(isSelected ? null : book.id)}
                    style={{
                      height: `${spine.height}px`,
                      width: `${spine.width}px`,
                    }}
                    className={cn(
                      "group relative flex flex-col justify-between overflow-hidden rounded-t-[3px] bg-gradient-to-r shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl",
                      spine.bgGradient,
                      isSelected && "ring-2 ring-lime -translate-y-3 shadow-2xl",
                    )}
                    title={`Click to preview "${book.title}" by ${book.authors.join(", ")}`}
                  >
                    {/* Top Spine Ribbon / Accent */}
                    <div className="flex w-full items-center justify-between border-b border-white/20 p-1">
                      <span
                        className="font-mono text-[8px] font-bold tracking-tighter"
                        style={{ color: spine.accentColor }}
                      >
                        {spine.badge ?? `${idx + 1}`}
                      </span>
                    </div>

                    {/* Vertical Title Typography */}
                    <div className="flex flex-1 items-center justify-center py-2">
                      <span
                        className="line-clamp-2 select-none font-serif text-[11px] font-semibold tracking-wide"
                        style={{
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                          color: spine.textColor,
                        }}
                      >
                        {book.title}
                      </span>
                    </div>

                    {/* Bottom Spine Publisher Marker */}
                    <div className="flex w-full flex-col items-center border-t border-white/20 pb-1 pt-0.5">
                      <span className="font-mono text-[7px] uppercase tracking-tighter text-white/60">
                        {book.category?.slug.slice(0, 3).toUpperCase() ?? "LIB"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded In-Shelf Showcase Spread (matching reference video) */}
                  {isSelected && (
                    <div className="mx-2 flex w-[320px] shrink-0 flex-col gap-4 rounded-xl border border-neutral-300 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 sm:w-[540px] sm:flex-row sm:p-5">
                      {/* Left: Interactive Cover */}
                      <div className="group relative flex w-36 shrink-0 flex-col items-center">
                        <div
                          onClick={() => setReaderBook(book)}
                          className="relative cursor-pointer overflow-hidden rounded-md shadow-lg transition-transform duration-300 hover:scale-[1.03]"
                        >
                          <BookCover
                            src={book.coverUrl}
                            title={book.title}
                            className="w-36 rounded-md"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                            <span className="flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 font-mono text-[10px] font-bold text-ink shadow">
                              <BookOpen className="size-3" /> Look Inside
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReaderBook(book)}
                          className="mt-2 h-7 w-full gap-1 font-mono text-[10px]"
                        >
                          <BookOpen className="size-3" /> Read First Pages
                        </Button>
                      </div>

                      {/* Right: Editorial Book Spread Details */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-serif text-base font-bold leading-tight tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-lg">
                                {book.title}
                              </h3>
                              <p className="mt-0.5 font-serif text-xs italic text-neutral-600 dark:text-neutral-400">
                                {book.authors.join(", ")}
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveBookId(null)}
                              className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                              aria-label="Close Book View"
                            >
                              <X className="size-4" />
                            </button>
                          </div>

                          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                            {book.description ??
                              "A key volume in our active physical collection, catalogued for readers, researchers, and students."}
                          </p>

                          {/* Video-style Metadata Table */}
                          <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 border-y border-neutral-200 py-2 dark:border-neutral-800">
                            <div className="text-[10px]">
                              <span className="font-mono uppercase text-neutral-500">
                                PUBLISHED:
                              </span>{" "}
                              <span className="font-semibold">{book.publicationYear ?? "N/A"}</span>
                            </div>
                            <div className="text-[10px]">
                              <span className="font-mono uppercase text-neutral-500">
                                PUBLISHER:
                              </span>{" "}
                              <span className="font-semibold">{book.publisher ?? "Library"}</span>
                            </div>
                            <div className="text-[10px]">
                              <span className="font-mono uppercase text-neutral-500">FORMAT:</span>{" "}
                              <span className="font-semibold">
                                {book.category?.name ?? "General"}
                              </span>
                            </div>
                            <div className="text-[10px]">
                              <span className="font-mono uppercase text-neutral-500">PAGES:</span>{" "}
                              <span className="font-semibold">{book.pages ?? 320} pp.</span>
                            </div>
                            <div className="col-span-2 text-[10px]">
                              <span className="font-mono uppercase text-neutral-500">STATUS:</span>{" "}
                              <span
                                className={cn(
                                  "font-semibold",
                                  book.availableCopies > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-600",
                                )}
                              >
                                {book.availableCopies > 0
                                  ? `${book.availableCopies} Copies Available on Shelf`
                                  : "All Copies Checked Out"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Button
                            onClick={() => setReaderBook(book)}
                            variant="lime"
                            size="sm"
                            className="h-8 gap-1.5 rounded-full text-xs font-semibold"
                          >
                            <BookOpen className="size-3.5" /> Read First Pages
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full text-xs"
                          >
                            <Link to="/books/$id" params={{ id: book.id }} className="gap-1">
                              Details <ArrowRight className="size-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Shelf Base Line (wood shelf texture) */}
        <div className="absolute inset-x-0 bottom-0 h-4 border-t border-[#c5beaf] bg-gradient-to-r from-[#9c7a52] via-[#b89569] to-[#8c6b45] shadow dark:border-[#2a2a30] dark:from-[#2e261f] dark:via-[#3b3127] dark:to-[#221c17]" />
      </div>

      {/* Reader Modal Overlay */}
      {readerBook && <BookPageReader book={readerBook} onClose={() => setReaderBook(null)} />}
    </section>
  );
}
