import { createFileRoute } from "@tanstack/react-router";
import { Page, PageTitle } from "@/components/layout/AppLayout";
import { BorrowedBookCard } from "@/components/books/cards";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { useBorrows } from "@/hooks/use-library";
import { dueState } from "@/lib/due";

export const Route = createFileRoute("/_authenticated/due-dates")({
  head: () => ({
    meta: [
      { title: "Due Dates — গ্রন্থাগার" },
      {
        name: "description",
        content: "Upcoming and overdue books, calculated from your borrowing records.",
      },
      { property: "og:title", content: "Due Dates — গ্রন্থাগার" },
      { property: "og:description", content: "Upcoming and overdue books." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DueDates,
});

function DueDates() {
  const { data, isLoading, error, refetch } = useBorrows();
  const active = (data ?? [])
    .filter((b) => !b.returnedAt)
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
  const overdue = active.filter((b) => dueState(b.dueAt, null) === "overdue");
  const soon = active.filter((b) => dueState(b.dueAt, null) === "due_soon");
  const later = active.filter((b) => dueState(b.dueAt, null) === "active");

  const stats = [
    { label: "Borrowed", value: active.length, cls: "bg-card" },
    { label: "Due soon", value: soon.length, cls: "bg-lime" },
    { label: "Overdue", value: overdue.length, cls: "bg-ink text-primary-foreground" },
  ];

  return (
    <Page>
      <PageTitle title="Due Dates" subtitle="Calculated live from your borrowing records." />
      <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl p-3 shadow-soft sm:rounded-3xl sm:p-4 ${s.cls}`}
          >
            <p className="text-2xl font-extrabold sm:text-3xl">{s.value}</p>
            <p className="truncate text-[11px] font-semibold opacity-75 sm:text-xs">{s.label}</p>
          </div>
        ))}
      </div>
      {isLoading ? (
        <LoadingSkeleton variant="list" count={3} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : !active.length ? (
        <EmptyState title="Nothing due" description="You have no books on loan right now." />
      ) : (
        <div className="space-y-8">
          {[
            ["Overdue", overdue],
            ["Due soon", soon],
            ["Later", later],
          ].map(([t, list]) =>
            (list as typeof active).length ? (
              <section key={t as string}>
                <h2 className="mb-3 text-sm font-bold text-muted-foreground">{t as string}</h2>
                <div className="grid gap-3 lg:grid-cols-2">
                  {(list as typeof active).map((b) => (
                    <BorrowedBookCard key={b.id} b={b} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}
    </Page>
  );
}
