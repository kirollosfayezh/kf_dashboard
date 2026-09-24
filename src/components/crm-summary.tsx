import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlarmClock } from "lucide-react";
import { crm, STAGES, type CrmOverview } from "@/services/crm";
import { STAGE_META, ago, contactName, moneyByCurrency } from "@/lib/crm";
import { Card, PanelHead, StatTile } from "@/components/ui";

/**
 * The Overview's CRM strip: who is on the site now, new contacts, the open
 * pipeline, today's follow-ups and the latest activity. Loads on its own so a
 * CRM hiccup never blanks the rest of the Overview.
 */
export function CrmSummary() {
  const [data, setData] = useState<CrmOverview | null>(null);
  useEffect(() => {
    crm.overview().then(setData).catch(() => setData(null));
  }, []);
  if (!data) return null;

  const openCount = data.stages.filter((s) => s.stage !== "won" && s.stage !== "lost").reduce((n, s) => n + s.count, 0);
  const maxCount = Math.max(1, ...data.stages.map((s) => s.count));

  return (
    <>
      <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))" }}>
        <StatTile label="On the site now" value={String(data.online)} caption="active in the last 5 minutes" tone={data.online ? "success" : "neutral"} />
        <StatTile label="New contacts" value={String(data.newContacts7)} caption={`${data.newContacts30} in 30 days`} />
        <StatTile label="Open pipeline" value={moneyByCurrency(data.openPipeline)} caption={`${openCount} open deals`} />
        <StatTile label="Visitor → contact" value={`${(data.conversion30 * 100).toFixed(1)}%`} caption={`of ${data.visitors30} visitors in 30 days`} />
      </div>

      <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
        <Card>
          <PanelHead title="Pipeline" subtitle="Deals by stage." />
          <div className="flex flex-col gap-2.5">
            {STAGES.map((s) => {
              const row = data.stages.find((x) => x.stage === s);
              return (
                <Link key={s} to="/pipeline" className="grid grid-cols-[84px_1fr_auto] items-center gap-3 text-ui">
                  <span className="text-muted">{STAGE_META[s].label}</span>
                  <span className="h-2 rounded-full bg-hover">
                    <span className="block h-2 rounded-full" style={{ width: `${((row?.count ?? 0) / maxCount) * 100}%`, background: STAGE_META[s].color }} />
                  </span>
                  <span className="font-mono text-caption">{row?.count ?? 0}</span>
                </Link>
              );
            })}
          </div>
        </Card>
        <Card>
          <PanelHead title="Follow-ups due" subtitle="Today and overdue." />
          {data.followUps.length ? (
            <div className="flex flex-col gap-2">
              {data.followUps.slice(0, 6).map((c) => (
                <Link key={c.id} to="/contacts/$id" params={{ id: c.id }} className="flex items-center gap-2.5 text-ui">
                  <AlarmClock size={15} className={Date.parse(c.nextFollowUpAt!) < Date.now() ? "text-danger" : "text-warning"} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{contactName(c)}</span>
                  <span className="text-caption text-faint">{new Date(c.nextFollowUpAt!).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-ui text-faint">Nothing due. Set a follow-up date on any contact.</p>
          )}
        </Card>
        <Card>
          <PanelHead title="Recent activity" subtitle="Across all contacts." />
          {data.recent.length ? (
            <div className="flex flex-col gap-2.5">
              {data.recent.slice(0, 7).map((a) => (
                <Link key={a.id} to="/contacts/$id" params={{ id: a.contactId }} className="block min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-ui font-semibold">{a.contactName}</span>
                    <span className="shrink-0 text-caption text-faint">{ago(a.at)}</span>
                  </div>
                  <div className="truncate text-caption text-muted">{a.text}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-ui text-faint">No activity yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
