import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Page, PageTitle } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton, EmptyState } from "@/components/shared/states";
import { useCreateReadingList, useReadingLists } from "@/hooks/use-library";
import { library } from "@/services";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reading-lists")({
  head: () => ({ meta: [{ title: "Reading lists — গ্রন্থাগার" }] }),
  component: ReadingListsPage,
});

function ReadingListsPage() {
  const lists = useReadingLists();
  const create = useCreateReadingList();
  const [name, setName] = useState("");
  const [share, setShare] = useState("");

  return (
    <Page>
      <PageTitle
        title="Reading lists"
        subtitle="Build collections for classes and reading goals."
      />
      <form
        className="mb-6 grid gap-3 rounded-3xl bg-card p-4 shadow-soft sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          create.mutate({ name: name.trim(), publicSlug: share.trim() || undefined });
          setName("");
          setShare("");
        }}
      >
        <label className="sr-only" htmlFor="list-name">
          List name
        </label>
        <input
          id="list-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="List name"
          className="h-11 rounded-2xl border bg-background px-3 text-sm"
        />
        <label className="sr-only" htmlFor="share-slug">
          Optional share slug
        </label>
        <input
          id="share-slug"
          value={share}
          onChange={(event) => setShare(event.target.value)}
          placeholder="Optional share link"
          className="h-11 rounded-2xl border bg-background px-3 text-sm"
        />
        <Button type="submit" variant="hero" size="pill" disabled={create.isPending}>
          Create
        </Button>
      </form>
      {lists.isLoading ? (
        <LoadingSkeleton count={3} variant="list" />
      ) : lists.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {lists.data.map((list) => (
            <article key={list.id} className="rounded-3xl bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-extrabold">{list.name}</h2>
                  <p className="text-xs text-muted-foreground">{list.books.length} books</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await library.deleteReadingList(list.id);
                    toast.success("Reading list deleted");
                    lists.refetch();
                  }}
                >
                  Delete
                </Button>
              </div>
              {list.publicSlug && (
                <p className="mt-3 text-xs text-primary">Share: /reading-list/{list.publicSlug}</p>
              )}
              <ul className="mt-3 space-y-1 text-sm">
                {list.books.map((book) => (
                  <li key={book.id} className="text-muted-foreground">
                    {book.title}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No reading lists"
          description="Create a list for your next semester or reading goal."
        />
      )}
    </Page>
  );
}
