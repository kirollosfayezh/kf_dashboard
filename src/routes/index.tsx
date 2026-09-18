import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/services/http";
import type { ContentItem, Lead } from "@/services/domain-types";
import { CONTENT_COLLECTIONS } from "@/services/domain-types";
import { Card, ErrorBanner, SectionHead, Spinner } from "@/components/ui";
import { useAuth, type AdminUser } from "@/store/auth";

export const Route = createFileRoute("/")({
  component: OverviewPage,
});

interface Stat {
  label: string;
  value: string;
  to: string;
}

function greetingName(user: AdminUser | null): string {
  return user?.name?.trim() || user?.email?.split("@")[0] || "";
}

function OverviewPage() {
  const user = useAuth((s) => s.user);
  const [stats, setStats] = useState<Stat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [newLeads, ...collections] = await Promise.all([
          api.get<Lead[]>("/admin/leads?status=new"),
          ...CONTENT_COLLECTIONS.map((c) => api.get<ContentItem[]>(`/admin/content/${c.key}`)),
        ]);
        if (cancelled) return;
        const collectionStats: Stat[] = CONTENT_COLLECTIONS.map((c, i) => {
          const items = collections[i] ?? [];
          const published = items.filter((it) => it.published).length;
          return { label: c.label, value: `${published} / ${items.length}`, to: `/${c.key}` };
        });
        setStats([{ label: "New leads", value: String(newLeads.length), to: "/inbox" }, ...collectionStats]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load overview");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="kf-scr">
      <SectionHead
        title={`Welcome back${greetingName(user) ? `, ${greetingName(user)}` : ""}`}
        subtitle="New leads and published content across every collection."
      />
      {error ? <ErrorBanner message={error} /> : null}
      {!stats && !error ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : null}
      {stats ? (
        <div
          className="grid gap-3 sm:gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))" }}
        >
          {stats.map((s) => (
            <Link key={s.label} to={s.to}>
              <Card className="transition-transform hover:-translate-y-0.5">
                <div className="text-[12.5px]" style={{ color: "var(--text2)" }}>
                  {s.label}
                </div>
                <div className="font-display mt-2 text-[29px] font-bold tracking-tight">{s.value}</div>
                {s.label !== "New leads" ? (
                  <div className="mt-1.5 text-[11.5px]" style={{ color: "var(--text3)" }}>
                    published / total
                  </div>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
