import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./buttons";

export interface DataColumn {
  label: string;
  /** Grid track width, e.g. "2fr" or "90px". */
  w: string;
  /** Hidden in the stacked mobile card (the value is usually already in the title row). */
  hideOnMobile?: boolean;
}

/**
 * Bordered panel, mono column heads, hairline-separated rows. From `md` the rows
 * are a grid that scrolls sideways rather than crushing columns; below `md` each
 * row stacks into a labelled card so 375px never overflows.
 */
export function DataTable({
  columns,
  rows,
  rowKey,
}: {
  columns: DataColumn[];
  rows: React.ReactNode[][];
  rowKey?: (i: number) => string;
}) {
  const template = columns.map((c) => c.w).join(" ");
  return (
    <div className="kf-tw rounded-card border border-line bg-panel">
      <div className="kf-tw-inner overflow-hidden rounded-card">
        <div
          className="label hidden gap-[14px] border-b border-line bg-raised px-5 py-3 text-faint md:grid"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c, i) => (
            <div key={i}>{c.label}</div>
          ))}
        </div>
        {rows.map((cells, ri) => (
          <div
            key={rowKey ? rowKey(ri) : ri}
            className={cn(
              "kf-row flex flex-col gap-2 px-4 py-4 text-body transition-colors md:grid md:min-h-row md:items-center md:gap-[14px] md:px-5",
              ri < rows.length - 1 && "border-b border-line",
            )}
            style={{ gridTemplateColumns: template }}
          >
            {cells.map((c, i) => {
              const col = columns[i];
              const labelled = col?.label && !col.hideOnMobile;
              return (
                <div key={i} className="flex min-w-0 items-center gap-2 md:block">
                  {labelled ? (
                    <span className="label w-[84px] shrink-0 text-faint md:hidden">{col.label}</span>
                  ) : null}
                  <div className="min-w-0 flex-1">{c}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RowActions({
  onEdit,
  onDelete,
  extra,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex justify-end gap-1.5">
      {extra}
      {onEdit ? <IconButton label="Edit" icon={<Pencil size={14} />} onClick={onEdit} /> : null}
      {onDelete ? (
        <IconButton label="Delete" tone="danger" icon={<Trash2 size={14} />} onClick={onDelete} />
      ) : null}
    </div>
  );
}
