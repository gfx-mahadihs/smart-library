import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, BookOpen, BookmarkCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Book } from "@/types/library";
import { generatePreviewPages, type BookPreviewPage } from "@/data/bookSpinesAndPages";
import { Button } from "@/components/ui/button";

interface Props {
  book: Book;
  onClose: () => void;
}

export function BookPageReader({ book, onClose }: Props) {
  const pages: BookPreviewPage[] = generatePreviewPages(book);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        setCurrentPageIndex((prev) => Math.min(prev + 1, pages.length - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentPageIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pages.length]);

  const currentPage = pages[currentPageIndex];
  const nextPage = pages[currentPageIndex + 1];

  const goNext = () => setCurrentPageIndex((prev) => Math.min(prev + 2, pages.length - 1));
  const goPrev = () => setCurrentPageIndex((prev) => Math.max(prev - 2, 0));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#f5f2eb] shadow-2xl dark:bg-[#1c1c1f]">
        {/* Top Reader Header */}
        <div className="flex items-center justify-between border-b border-[#e2dcd0] px-4 py-3 dark:border-[#2e2e33] sm:px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-[#8b5e3c] dark:text-[#d1a075]" />
            <div>
              <p className="font-serif text-sm font-semibold tracking-tight text-[#222] dark:text-[#eee] sm:text-base">
                {book.title}
              </p>
              <p className="text-[11px] text-[#666] dark:text-[#aaa]">
                First Few Pages Preview · {book.authors.join(", ")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#444] hover:bg-[#e4ded2] dark:text-[#bbb] dark:hover:bg-[#2b2b30]"
            aria-label="Close Preview"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Book Open Spread Body */}
        <div className="relative flex flex-1 flex-col overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto grid w-full max-w-4xl flex-1 gap-6 md:grid-cols-2 md:gap-0">
            {/* Left Page */}
            <div className="relative flex flex-col justify-between rounded-l-lg border border-[#e5dfd3] bg-[#fbf9f4] p-6 shadow-sm dark:border-[#333] dark:bg-[#222226] sm:p-8">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#8b5e3c] dark:text-[#d1a075]">
                  {currentPage.title}
                </span>
                <h3 className="mt-2 font-serif text-xl font-bold tracking-tight text-[#1a1a1a] dark:text-[#fafafa]">
                  {currentPage.content.heading}
                </h3>
                {currentPage.content.subheading && (
                  <p className="mt-1 font-serif text-xs italic text-[#666] dark:text-[#999]">
                    {currentPage.content.subheading}
                  </p>
                )}

                {currentPage.content.quote && (
                  <blockquote className="my-5 border-l-2 border-[#8b5e3c] pl-3 italic text-[#444] dark:border-[#d1a075] dark:text-[#ccc]">
                    “{currentPage.content.quote.text}”
                    <footer className="mt-1 text-[11px] not-italic text-[#777] dark:text-[#888]">
                      — {currentPage.content.quote.author}
                    </footer>
                  </blockquote>
                )}

                {currentPage.content.text?.map((para, i) => (
                  <p
                    key={i}
                    className="mt-3 font-serif text-xs leading-relaxed text-[#333] dark:text-[#ccc] sm:text-sm"
                  >
                    {para}
                  </p>
                ))}

                {currentPage.content.tableOfContents && (
                  <div className="mt-4 space-y-2 border-t border-[#e2dcd0] pt-4 dark:border-[#333]">
                    {currentPage.content.tableOfContents.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between font-serif text-xs text-[#333] dark:text-[#ccc]"
                      >
                        <span>{item.title}</span>
                        <span className="font-mono text-[11px] text-[#888]">p. {item.page}</span>
                      </div>
                    ))}
                  </div>
                )}

                {currentPage.content.metadata && (
                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#e2dcd0] pt-4 dark:border-[#333]">
                    {Object.entries(currentPage.content.metadata).map(([k, v]) => (
                      <div key={k} className="text-[11px]">
                        <span className="font-mono uppercase text-[#777] dark:text-[#999]">
                          {k}:
                        </span>{" "}
                        <span className="font-semibold text-[#222] dark:text-[#eee]">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-[#eee8db] pt-3 text-[10px] text-[#888] dark:border-[#333]">
                <span>granthagar digital preview</span>
                <span className="font-mono">— {currentPage.pageNumber} —</span>
              </div>
            </div>

            {/* Right Page (or next content) */}
            <div className="relative hidden flex-col justify-between rounded-r-lg border-y border-r border-[#e5dfd3] bg-[#fdfcfa] p-6 shadow-sm dark:border-[#333] dark:bg-[#25252a] md:flex sm:p-8">
              {nextPage ? (
                <>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#8b5e3c] dark:text-[#d1a075]">
                      {nextPage.title}
                    </span>
                    <h3 className="mt-2 font-serif text-xl font-bold tracking-tight text-[#1a1a1a] dark:text-[#fafafa]">
                      {nextPage.content.heading}
                    </h3>
                    {nextPage.content.subheading && (
                      <p className="mt-1 font-serif text-xs italic text-[#666] dark:text-[#999]">
                        {nextPage.content.subheading}
                      </p>
                    )}

                    {nextPage.content.quote && (
                      <blockquote className="my-5 border-l-2 border-[#8b5e3c] pl-3 italic text-[#444] dark:border-[#d1a075] dark:text-[#ccc]">
                        “{nextPage.content.quote.text}”
                        <footer className="mt-1 text-[11px] not-italic text-[#777] dark:text-[#888]">
                          — {nextPage.content.quote.author}
                        </footer>
                      </blockquote>
                    )}

                    {nextPage.content.text?.map((para, i) => (
                      <p
                        key={i}
                        className="mt-3 font-serif text-xs leading-relaxed text-[#333] dark:text-[#ccc] sm:text-sm"
                      >
                        {para}
                      </p>
                    ))}

                    {nextPage.content.metadata && (
                      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#e2dcd0] pt-4 dark:border-[#333]">
                        {Object.entries(nextPage.content.metadata).map(([k, v]) => (
                          <div key={k} className="text-[11px]">
                            <span className="font-mono uppercase text-[#777] dark:text-[#999]">
                              {k}:
                            </span>{" "}
                            <span className="font-semibold text-[#222] dark:text-[#eee]">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[#eee8db] pt-3 text-[10px] text-[#888] dark:border-[#333]">
                    <span className="font-mono">— {nextPage.pageNumber} —</span>
                    <span>{book.category?.name ?? "Collection"}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <BookmarkCheck className="size-12 text-[#8b5e3c] dark:text-[#d1a075]" />
                  <h4 className="mt-3 font-serif text-lg font-bold">End of Book Preview</h4>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    You have browsed the first few pages of this title. Borrow or reserve this copy
                    to read the complete work.
                  </p>
                  <Button asChild variant="lime" size="sm" className="mt-4">
                    <Link to="/books/$id" params={{ id: book.id }}>
                      View Book Details
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Navigation Toolbar */}
        <div className="flex items-center justify-between border-t border-[#e2dcd0] bg-[#eae5da] px-4 py-3 dark:border-[#2e2e33] dark:bg-[#18181b] sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={currentPageIndex === 0}
            className="gap-1 font-mono text-xs"
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>

          <span className="font-mono text-xs text-[#555] dark:text-[#aaa]">
            Pages {currentPage.pageNumber}
            {nextPage ? `–${nextPage.pageNumber}` : ""} of {pages.length}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            disabled={currentPageIndex >= pages.length - 2}
            className="gap-1 font-mono text-xs"
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
