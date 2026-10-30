import { useState } from "react";
import { Card } from "@/components/ui";

/** Panel wrapper with the mockup's 17px heading and a view switch (chart/table). */
export function ChartCard({
  title,
  subtitle,
  chart,
  table,
}: {
  title: string;
  subtitle?: string;
  chart: React.ReactNode;
  table: React.ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card>
      <div className="mb-[18px] flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-section font-semibold tracking-[-.01em]">{title}</h2>
          {subtitle ? (
            <p className="mt-[5px] text-ui text-muted">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div
          className="flex shrink-0 overflow-hidden rounded-control border border-line"
        >
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className="font-mono px-2.5 py-1.5 text-label uppercase tracking-[.08em]"
              style={{
                background: view === v ? "var(--hover)" : "transparent",
                color: view === v ? "var(--text)" : "var(--text3)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {view === "chart" ? chart : table}
    </Card>
  );
}
