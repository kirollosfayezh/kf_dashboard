import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlarmClock, SquareKanban } from "lucide-react";
import { crm, STAGES, type Contact, type Stage } from "@/services/crm";
import { STAGE_META, ago, contactName, money } from "@/lib/crm";
import { Button, Callout, EmptyState, Field, Input, LoadingState, Modal, PageHeader } from "@/components/ui";

export const Route = createFileRoute("/pipeline")({ component: PipelinePage });

/**
 * The sales board. Every contact is a deal in one of five stages; drag a card
 * to move it (or use the stage menu on the card — the same action for
 * keyboard and touch). Moving to Lost asks why, because "why do we lose" is
 * the most useful report a small studio can have.
 */
function PipelinePage() {
  const [rows, setRows] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [losing, setLosing] = useState<Contact | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    crm.contacts({ limit: "1000" }).then(setRows).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const columns = useMemo(() => {
    const by: Record<Stage, Contact[]> = { new: [], qualified: [], proposal: [], won: [], lost: [] };
    for (const c of rows ?? []) by[c.stage]?.push(c);
    return by;
  }, [rows]);

  const move = async (c: Contact, stage: Stage, lostReason?: string) => {
    if (c.stage === stage) return;
    const before = rows;
    setRows((prev) => (prev ?? []).map((x) => (x.id === c.id ? { ...x, stage, lostReason } : x)));
    try {
      await crm.updateContact(c.id, { stage, ...(stage === "lost" ? { lostReason: lostReason ?? "" } : {}) });
    } catch (e) {
      setRows(before);
      setError(e instanceof Error ? e.message : "Could not move the deal");
    }
  };

  const requestMove = (c: Contact, stage: Stage) => {
    if (stage === "lost") {
      setReason("");
      setLosing(c);
    } else void move(c, stage);
  };

  const total = (list: Contact[]) => {
    const byCur = new Map<string, number>();
    for (const c of list) if (c.value) byCur.set(c.currency, (byCur.get(c.currency) ?? 0) + c.value);
    return [...byCur.entries()].map(([cur, v]) => money(v, cur)).join(" + ") || "—";
  };

  return (
    <div className="kf-scr">
      <PageHeader title="Pipeline" subtitle="Drag a deal to move it between stages. Values come from each contact's deal settings or an accepted quote." />
      {error ? <Callout tone="danger" className="mb-4">{error}</Callout> : null}

      {!rows ? (
        <LoadingState variant="skeleton" skeleton="cards" rows={5} />
      ) : !rows.length ? (
        <EmptyState icon={<SquareKanban size={22} />} title="No deals yet" body="Every new contact starts here as a New deal." />
      ) : (
        <div className="kf-scrollbar -mx-[18px] flex gap-3 overflow-x-auto px-[18px] pb-3 md:-mx-[26px] md:px-[26px]">
          {STAGES.map((stage) => {
            const list = columns[stage];
            return (
              <section
                key={stage}
                aria-label={STAGE_META[stage].label}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(stage);
                }}
                onDragLeave={() => setOver((s) => (s === stage ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const c = rows.find((x) => x.id === (dragId ?? e.dataTransfer.getData("text/plain")));
                  if (c) requestMove(c, stage);
                  setDragId(null);
                }}
                className="flex w-[270px] shrink-0 flex-col rounded-card border bg-panel transition-colors"
                style={{ borderColor: over === stage ? STAGE_META[stage].color : "var(--color-line)" }}
              >
                <header className="border-b border-line px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: STAGE_META[stage].color }} />
                    <span className="text-ui font-semibold">{STAGE_META[stage].label}</span>
                    <span className="font-mono ml-auto text-caption text-faint">{list.length}</span>
                  </div>
                  <div className="font-mono mt-1 truncate text-caption text-muted">{total(list)}</div>
                </header>
                <div className="flex min-h-[120px] flex-col gap-2 p-2.5">
                  {list.map((c) => {
                    const due = c.nextFollowUpAt && Date.parse(c.nextFollowUpAt) <= Date.now() + 86400000 && stage !== "won" && stage !== "lost";
                    return (
                      <article
                        key={c.id}
                        draggable
                        onDragStart={(e) => {
                          setDragId(c.id);
                          e.dataTransfer.setData("text/plain", c.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => setDragId(null)}
                        className="cursor-grab rounded-control border border-line bg-raised p-3 transition-opacity active:cursor-grabbing"
                        style={{ opacity: dragId === c.id ? 0.5 : 1 }}
                      >
                        <Link to="/contacts/$id" params={{ id: c.id }} className="block truncate text-ui font-semibold hover:underline">
                          {contactName(c)}
                        </Link>
                        {c.company ? <div className="truncate text-caption text-faint">{c.company}</div> : null}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="font-mono text-caption">{c.value ? money(c.value, c.currency) : "—"}</span>
                          <span className="text-caption text-faint">{ago(c.lastActivityAt)}</span>
                        </div>
                        {due ? (
                          <div className="mt-2 flex items-center gap-1 text-caption text-warning">
                            <AlarmClock size={12} />
                            {Date.parse(c.nextFollowUpAt!) <= Date.now() ? "Follow-up due" : `Follow up ${new Date(c.nextFollowUpAt!).toLocaleDateString()}`}
                          </div>
                        ) : null}
                        {stage === "lost" && c.lostReason ? <div className="mt-2 truncate text-caption text-faint">“{c.lostReason}”</div> : null}
                        <select
                          aria-label={`Move ${contactName(c)} to another stage`}
                          value={c.stage}
                          onChange={(e) => requestMove(c, e.target.value as Stage)}
                          className="mt-2 w-full rounded-xs border border-line bg-panel px-2 py-1 text-caption text-muted"
                        >
                          {STAGES.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
                        </select>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={!!losing}
        onClose={() => setLosing(null)}
        title="Why was this deal lost?"
        description="Optional, but it's what tells you what to fix."
        footer={
          <>
            <Button onClick={() => setLosing(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (losing) void move(losing, "lost", reason.trim());
                setLosing(null);
              }}
            >
              Mark as lost
            </Button>
          </>
        }
      >
        <Field label="Reason">
          <Input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Price, timing, chose another vendor, no reply…" />
        </Field>
      </Modal>
    </div>
  );
}
