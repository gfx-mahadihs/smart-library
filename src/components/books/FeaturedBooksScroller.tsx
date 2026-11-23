import type { Book } from "@/types/library";
import { FeaturedBookCard } from "./BookCard";

export function FeaturedBooksScroller({ books }: { books: Book[] }) {
  return (
    <div className="featured-books-scroller no-scrollbar -mx-4 overflow-hidden px-4 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
      <div className="featured-books-track">
        <div className="featured-books-group">
          {books.map((book) => (
            <FeaturedBookCard key={book.id} book={book} />
          ))}
        </div>
        <div className="featured-books-group" aria-hidden="true">
          {books.map((book) => (
            <FeaturedBookCard key={`duplicate-${book.id}`} book={book} viewTransition={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
