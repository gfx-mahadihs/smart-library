import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Heart, Star } from "lucide-react";
import { Page } from "@/components/layout/AppLayout";
import { BookCover } from "@/components/books/BookCover";
import { AvailabilityBadge, ReservationBadge } from "@/components/books/badges";
import { ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  useFavoriteIds,
  useReservations,
  useReserveBook,
  useToggleFavorite,
  useJoinWaitlist,
  useLeaveWaitlist,
  useWaitlist,
  useReviews,
  useSaveReview,
  useDeleteReview,
} from "@/hooks/use-library";
import { useSuspenseQuery } from "@tanstack/react-query";
import { publicCatalogueQuery } from "@/services/public-catalogue";
import { PublicLibraryLayout } from "@/components/layout/PublicLibraryLayout";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/books/$id")({
  loader: async ({ context, params }) => {
    const catalogue = await context.queryClient.ensureQueryData(publicCatalogueQuery);
    if (!catalogue.books.some((b) => b.id === params.id)) throw notFound();
    return catalogue.books.find((b) => b.id === params.id);
  },
  pendingComponent: () => (
    <PublicLibraryLayout>
      <LoadingSkeleton count={1} />
    </PublicLibraryLayout>
  ),
  errorComponent: () => (
    <PublicLibraryLayout>
      <ErrorState message="This book could not be loaded." />
    </PublicLibraryLayout>
  ),
  notFoundComponent: () => (
    <PublicLibraryLayout>
      <ErrorState message="This book could not be found." />
    </PublicLibraryLayout>
  ),
  head: ({ loaderData: book }) => ({
    meta: [
      { title: `${book?.title ?? "Book details"} — গ্রন্থাগার` },
      {
        name: "description",
        content:
          book?.description?.slice(0, 160) ?? "Explore book details and availability at গ্রন্থাগার.",
      },
      { property: "og:title", content: `${book?.title ?? "Book details"} — গ্রন্থাগার` },
      {
        property: "og:description",
        content:
          book?.description?.slice(0, 160) ?? "Explore book details and availability at গ্রন্থাগার.",
      },
      { property: "og:type", content: "book" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(book?.coverUrl?.startsWith("https://")
        ? [
            { property: "og:image", content: book.coverUrl },
            { name: "twitter:image", content: book.coverUrl },
          ]
        : []),
    ],
  }),
  component: BookDetails,
});

function BookDetails() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { data: catalogue } = useSuspenseQuery(publicCatalogueQuery);
  const book = catalogue.books.find((b) => b.id === id);
  const { data: favIds = [] } = useFavoriteIds();
  const { data: reservations = [] } = useReservations();
  const toggle = useToggleFavorite();
  const reserve = useReserveBook();
  const joinWaitlist = useJoinWaitlist();
  const leaveWaitlist = useLeaveWaitlist();
  const waitlist = useWaitlist(id);
  const reviews = useReviews(id);
  const saveReview = useSaveReview();
  const deleteReview = useDeleteReview();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");

  if (!book) return <ErrorState message="This book could not be found." />;

  const fav = favIds.includes(book.id);
  const active = reservations.find(
    (r) => r.book.id === book.id && ["pending", "approved", "ready_for_pickup"].includes(r.status),
  );
  const canReserve = book.availableCopies > 0 && !active;
  const waitlistEntry = waitlist.data?.[0];

  const details: [string, string | number | null][] = [
    ["ISBN", book.isbn],
    ["Publisher", book.publisher],
    ["Category", book.category?.name ?? null],
    ["Department", book.department],
    ["Language", book.language],
    ["Published", book.publicationYear],
    ["Pages", book.pages],
    ["Total copies", book.totalCopies],
    ["Available", book.availableCopies],
  ];

  return (
    <PublicLibraryLayout>
      <Page>
        <Button
          variant="ghost"
          onClick={() => router.history.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Button>
        <div className="grid gap-8 sm:gap-10 md:grid-cols-[minmax(0,320px)_1fr] md:gap-14">
          <div className="relative mx-auto w-44 sm:w-52 md:w-full">
            <div className="pointer-events-none absolute -inset-8 -z-0 rounded-full aura-bg opacity-60 blur-3xl" />
            <div className="relative">
              <BookCover
                bookId={book.id}
                src={book.coverUrl}
                title={book.title}
                shared
                eager
                className="shadow-float"
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="min-w-0"
          >
            {book.category && (
              <Link
                to="/explore"
                search={{ category: book.category.slug }}
                className="text-xs font-bold uppercase tracking-widest text-primary"
              >
                {book.category.name}
              </Link>
            )}
            <h1 className="title-xl mt-2 break-words">{book.title}</h1>
            <p className="mt-2 text-base text-muted-foreground">
              by {book.authors.join(", ") || "Unknown author"}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-sm font-bold">
                <Star className="size-4 fill-lime text-ink" /> {book.rating.toFixed(1)}
              </span>
              <AvailabilityBadge available={book.availableCopies} total={book.totalCopies} />
              {active && <ReservationBadge status={active.status} />}
            </div>

            {book.description && (
              <p className="mt-6 max-w-prose leading-relaxed text-muted-foreground">
                {book.description}
              </p>
            )}

            {user && (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="hero"
                  size="xl"
                  className="sm:w-auto"
                  disabled={
                    (!canReserve && book.availableCopies > 0) ||
                    reserve.isPending ||
                    joinWaitlist.isPending
                  }
                  onClick={() =>
                    book.availableCopies > 0
                      ? reserve.mutate(book.id)
                      : waitlistEntry
                        ? leaveWaitlist.mutate(book.id)
                        : joinWaitlist.mutate(book.id)
                  }
                >
                  {active
                    ? "Already reserved"
                    : book.availableCopies > 0
                      ? reserve.isPending
                        ? "Reserving…"
                        : "Reserve Book"
                      : waitlistEntry
                        ? `Leave waitlist · Position ${waitlistEntry.position}`
                        : joinWaitlist.isPending
                          ? "Joining…"
                          : "Join waitlist"}
                </Button>
                <Button
                  variant="soft"
                  size="xl"
                  className="sm:w-auto"
                  aria-pressed={fav}
                  onClick={() => toggle.mutate({ bookId: book.id, fav })}
                >
                  <Heart className={cn("!size-5", fav && "fill-primary text-primary")} />{" "}
                  {fav ? "In favorites" : "Add to Favorites"}
                </Button>
              </div>
            )}
            {!canReserve && !active && (
              <p className="mt-3 text-xs text-muted-foreground">
                All copies are currently on loan, reserved or under maintenance.
              </p>
            )}

            <dl
              id="availability"
              className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-border shadow-soft sm:mt-10 sm:grid-cols-3"
            >
              {details.map(([k, v]) => (
                <div key={k} className="bg-card p-3 sm:p-4">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                    {k}
                  </dt>
                  <dd className="mt-1 truncate text-xs font-bold sm:text-sm">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
            {user && (
              <section className="mt-10" aria-labelledby="reviews-heading">
                <h2 id="reviews-heading" className="title-lg">
                  Reviews
                </h2>
                <form
                  className="mt-4 rounded-3xl bg-card p-4 shadow-soft"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveReview.mutate({ bookId: id, rating: reviewRating, body: reviewBody });
                  }}
                >
                  <label className="text-sm font-semibold" htmlFor="review-rating">
                    Your rating
                  </label>
                  <select
                    id="review-rating"
                    value={reviewRating}
                    onChange={(event) => setReviewRating(Number(event.target.value))}
                    className="mt-2 h-11 w-full rounded-2xl border bg-background px-3 text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} / 5
                      </option>
                    ))}
                  </select>
                  <label className="mt-3 block text-sm font-semibold" htmlFor="review-body">
                    Review
                  </label>
                  <textarea
                    id="review-body"
                    value={reviewBody}
                    onChange={(event) => setReviewBody(event.target.value)}
                    maxLength={5000}
                    className="mt-2 min-h-24 w-full rounded-2xl border bg-background p-3 text-sm"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      variant="hero"
                      size="pill"
                      disabled={saveReview.isPending}
                    >
                      {saveReview.isPending ? "Saving…" : "Save review"}
                    </Button>
                    {reviews.data?.some((review) => review.userId === user.id) && (
                      <Button
                        type="button"
                        variant="soft"
                        size="pill"
                        onClick={() => deleteReview.mutate(id)}
                        disabled={deleteReview.isPending}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </form>
                <div className="mt-4 space-y-3">
                  {(reviews.data ?? []).map((review) => (
                    <article key={review.id} className="rounded-3xl bg-card p-4 shadow-soft">
                      <p className="text-sm font-bold">{review.rating} / 5</p>
                      {review.body && (
                        <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>
                      )}
                    </article>
                  ))}
                  {!reviews.isLoading && !reviews.data?.length && (
                    <p className="text-sm text-muted-foreground">No reviews yet.</p>
                  )}
                </div>
              </section>
            )}
          </motion.div>
        </div>
      </Page>
    </PublicLibraryLayout>
  );
}
