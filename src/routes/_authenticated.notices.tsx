import { createFileRoute } from "@tanstack/react-router";
import { Page, PageTitle } from "@/components/layout/AppLayout";
import { EmptyState, LoadingSkeleton } from "@/components/shared/states";
import { useNotices } from "@/hooks/use-library";
import { formatDate } from "@/lib/due";

export const Route = createFileRoute("/_authenticated/notices")({
  head: () => ({ meta: [{ title: "Library notices — গ্রন্থাগার" }] }),
  component: NoticesPage,
});

function NoticesPage() {
  const notices = useNotices();
  return (
    <Page>
      <PageTitle title="Library notices" subtitle="Announcements and upcoming library events." />
      {notices.isLoading ? (
        <LoadingSkeleton count={3} variant="list" />
      ) : notices.data?.length ? (
        <div className="space-y-3">
          {notices.data.map((notice) => (
            <article key={notice.id} className="rounded-3xl bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-extrabold">{notice.title}</h2>
                {notice.pinned && (
                  <span className="rounded-full bg-lime px-2 py-1 text-[10px] font-bold text-lime-foreground">
                    Pinned
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{notice.body}</p>
              {notice.eventAt && (
                <p className="mt-2 text-xs font-semibold">{formatDate(notice.eventAt)}</p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No notices" description="Library announcements will appear here." />
      )}
    </Page>
  );
}
