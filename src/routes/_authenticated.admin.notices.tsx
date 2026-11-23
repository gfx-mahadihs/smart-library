import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ManagementTitle } from "@/components/admin/ManagementViews";
import { useNotices } from "@/hooks/use-library";
import { library } from "@/services";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton, EmptyState } from "@/components/shared/states";

export const Route = createFileRoute("/_authenticated/admin/notices")({
  head: () => ({ meta: [{ title: "Notices — গ্রন্থাগার" }] }),
  component: AdminNotices,
});

function AdminNotices() {
  const notices = useNotices();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  return (
    <>
      <ManagementTitle title="Library notices" />
      <form
        className="mb-6 rounded-3xl bg-card p-5 shadow-soft"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!title.trim() || !body.trim()) return;
          await library.saveNotice({
            title: title.trim(),
            body: body.trim(),
            pinned,
            eventAt: null,
          });
          toast.success("Notice published");
          setTitle("");
          setBody("");
          setPinned(false);
          await notices.refetch();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border bg-background px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Pinned
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="ml-2"
            />
          </label>
        </div>
        <label className="mt-3 block text-sm font-semibold">
          Message
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 min-h-24 w-full rounded-2xl border bg-background p-3"
          />
        </label>
        <Button type="submit" variant="hero" size="pill" className="mt-3">
          Publish
        </Button>
      </form>
      {notices.isLoading ? (
        <LoadingSkeleton count={3} variant="list" />
      ) : notices.data?.length ? (
        <div className="space-y-3">
          {notices.data.map((notice) => (
            <article
              key={notice.id}
              className="flex items-start justify-between gap-3 rounded-3xl bg-card p-4 shadow-soft"
            >
              <div>
                <h2 className="font-bold">{notice.title}</h2>
                <p className="text-sm text-muted-foreground">{notice.body}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await library.deleteNotice(notice.id);
                  toast.success("Notice deleted");
                  await notices.refetch();
                }}
              >
                Delete
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No notices" />
      )}
    </>
  );
}
