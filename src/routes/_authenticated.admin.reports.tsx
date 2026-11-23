import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ManagementTitle } from "@/components/admin/ManagementViews";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton, EmptyState } from "@/components/shared/states";
import { library } from "@/services";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — গ্রন্থাগার" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const report = useQuery({
    queryKey: ["admin-reports", from, to],
    queryFn: () =>
      library.adminReports(
        new Date(`${from}T00:00:00Z`).toISOString(),
        new Date(`${to}T23:59:59Z`).toISOString(),
      ),
  });

  const exportCsv = (name: string, rows: Array<Record<string, string | number>>) => {
    if (!rows.length) return;
    const header = Object.keys(rows[0]);
    const csv = [
      header.join(","),
      ...rows.map((row) => header.map((key) => JSON.stringify(row[key] ?? "")).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ManagementTitle title="Reports" />
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-3xl bg-card p-4 shadow-soft">
        <label className="text-xs font-semibold">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block h-11 rounded-2xl border bg-background px-3"
          />
        </label>
        <label className="text-xs font-semibold">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block h-11 rounded-2xl border bg-background px-3"
          />
        </label>
        <Button type="button" variant="soft" size="pill" onClick={() => report.refetch()}>
          Apply
        </Button>
        <Button type="button" variant="soft" size="pill" onClick={() => window.print()}>
          Print / PDF
        </Button>
        <Button
          type="button"
          variant="soft"
          size="pill"
          onClick={() =>
            exportCsv(
              "borrowed-books",
              (report.data?.mostBorrowed ?? []).map((r) => ({
                title: r.title,
                borrow_count: r.borrowCount,
              })),
            )
          }
        >
          Export CSV
        </Button>
      </div>
      {report.isLoading ? (
        <LoadingSkeleton count={3} variant="list" />
      ) : report.error ? (
        <EmptyState title="Reports unavailable" description={(report.error as Error).message} />
      ) : report.data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="font-extrabold">Most borrowed</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.data.mostBorrowed} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="borrowCount" fill="oklch(0.47 0.175 257)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="font-extrabold">Borrows by department</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.data.byDepartment} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="borrowCount" fill="oklch(0.94 0.2 123)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="font-extrabold">Overdue</h2>
            <p className="mt-2 text-3xl font-extrabold">{report.data.overdue.length}</p>
          </section>
          <section className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="font-extrabold">Fines collected</h2>
            <p className="mt-2 text-3xl font-extrabold">{report.data.finesCollected.toFixed(2)}</p>
          </section>
        </div>
      ) : null}
    </>
  );
}
