import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Page } from "@/components/layout/AppLayout";
import { BookCard } from "@/components/books/BookCard";
import { FeaturedBooksScroller } from "@/components/books/FeaturedBooksScroller";
import { CategoryCard } from "@/components/books/CategoryCard";
import { BorrowedBookCard, ReservationCard } from "@/components/books/cards";
import { InteractiveBookshelf } from "@/components/books/InteractiveBookshelf";
import { EmptyState, ErrorState, LoadingSkeleton, SectionHeader } from "@/components/shared/states";
import {
  useBooks,
  useBorrows,
  useCategories,
  useProfile,
  useReservations,
  useRecommendations,
  useNotices,
} from "@/hooks/use-library";
import { daysUntil } from "@/lib/due";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Home — গ্রন্থাগার" },
      {
        name: "description",
        content: "Your library at a glance: featured books, due dates and reservations.",
      },
      { property: "og:title", content: "গ্রন্থাগার — Home" },
      { property: "og:description", content: "Your library at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const seeAll = (to: "/explore" | "/my-library/borrowed" | "/my-library/reservations") => (
  <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
    See all <ArrowRight className="size-4" />
  </Link>
);

function Dashboard() {
  const { data: profile } = useProfile();
  const books = useBooks({ sort: "popular" });
  const recent = useBooks({ sort: "recent" });
  const cats = useCategories();
  const borrows = useBorrows();
  const res = useReservations();
  const recommendations = useRecommendations();
  const notices = useNotices();

  const all = books.data ?? [];
  const featured = all.filter((b) => b.featured);
  const activeBorrows = (borrows.data ?? [])
    .filter((b) => !b.returnedAt)
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
  const activeRes = (res.data ?? []).filter((r) =>
    ["pending", "approved", "ready_for_pickup"].includes(r.status),
  );
  const firstName = profile?.fullName?.split(" ")[0];

  return (
    <Page>
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="title-lg sm:text-4xl">{firstName || "Reader"}</h1>
      </header>

      {(notices.data ?? []).some((notice) => notice.pinned) && (
        <section className="mb-8 space-y-3" aria-label="Pinned library notices">
          {(notices.data ?? [])
            .filter((notice) => notice.pinned)
            .slice(0, 3)
            .map((notice) => (
              <article key={notice.id} className="rounded-3xl bg-primary-soft p-4">
                <h2 className="text-sm font-extrabold">{notice.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{notice.body}</p>
              </article>
            ))}
        </section>
      )}

      {activeBorrows[0] && (
        <Link
          to="/due-dates"
          className="mb-10 flex items-center gap-3 rounded-3xl bg-ink p-4 text-primary-foreground"
        >
          <span className="grid size-10 place-items-center rounded-full bg-lime text-lime-foreground">
            <CalendarClock className="size-5" />
          </span>
          <p className="min-w-0 flex-1 text-sm">
            <b className="line-clamp-1">{activeBorrows[0].book.title}</b>
            <span className="opacity-75">
              {(() => {
                const d = daysUntil(activeBorrows[0].dueAt);
                return d < 0 ? `Overdue by ${-d} days` : `Due in ${d} days`;
              })()}
            </span>
          </p>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* Interactive Bookshelf (Reference Video Aesthetic) */}
      <section className="mb-12">
        {books.isLoading ? (
          <LoadingSkeleton count={3} variant="list" />
        ) : books.error ? (
          <ErrorState message={books.error.message} onRetry={() => books.refetch()} />
        ) : (
          <InteractiveBookshelf
            books={all}
            categories={cats.data ?? []}
            title="Book Corner & Library Shelf"
            subtitle="Curated library of classic and modern works. Select any volume to explore details and preview the first few pages."
          />
        )}
      </section>

      <section className="mb-12">
        <SectionHeader title="Featured Books" action={seeAll("/explore")} />
        {books.isLoading ? (
          <LoadingSkeleton count={3} variant="list" />
        ) : books.error ? (
          <ErrorState message={books.error.message} onRetry={() => books.refetch()} />
        ) : (
          <FeaturedBooksScroller books={featured} />
        )}
      </section>

      <section className="mb-12">
        <SectionHeader title="Popular Categories" />
        {cats.isLoading ? (
          <LoadingSkeleton count={3} variant="list" />
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
            {(cats.data ?? []).map((c) => {
              const inCat = all.filter((b) => b.category?.id === c.id);
              return <CategoryCard key={c.id} category={c} books={inCat} count={inCat.length} />;
            })}
          </div>
        )}
      </section>

      <section className="mb-12">
        <SectionHeader title="Recommended for You" action={seeAll("/explore")} />
        {recommendations.isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
            {(recommendations.data ?? all.slice(0, 6)).map((b) => (
              <div key={b.id}>
                <BookCard book={b} />
                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                  Because you read or save similar books
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mb-12 grid gap-10 lg:grid-cols-2">
        <section>
          <SectionHeader title="My Borrowed Books" action={seeAll("/my-library/borrowed")} />
          {borrows.isLoading ? (
            <LoadingSkeleton count={2} variant="list" />
          ) : activeBorrows.length ? (
            <div className="space-y-3">
              {activeBorrows.slice(0, 3).map((b) => (
                <BorrowedBookCard key={b.id} b={b} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing borrowed yet"
              description="Books you check out at the library desk will appear here with their due dates."
            />
          )}
        </section>
        <section>
          <SectionHeader title="My Reservations" action={seeAll("/my-library/reservations")} />
          {res.isLoading ? (
            <LoadingSkeleton count={2} variant="list" />
          ) : activeRes.length ? (
            <div className="space-y-3">
              {activeRes.slice(0, 3).map((r) => (
                <ReservationCard key={r.id} r={r} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active reservations"
              description="Reserve an available book and pick it up at the desk."
              action={
                <Button asChild variant="lime" size="pill">
                  <Link to="/explore">Find a book</Link>
                </Button>
              }
            />
          )}
        </section>
      </div>

      <section>
        <SectionHeader title="Recently Added" action={seeAll("/explore")} />
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
          {(recent.data ?? []).slice(0, 10).map((b) => (
            <div key={b.id} className="w-32 shrink-0 sm:w-36">
              <BookCard book={b} hideAvailability />
            </div>
          ))}
        </div>
      </section>
    </Page>
  );
}
