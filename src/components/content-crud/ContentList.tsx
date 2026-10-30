import type { ContentItem } from "@/services/domain-types";
import { mediaPreviewUrl } from "@/lib/utils";
import { Button, Card, DataTable, Pill, RowActions, Toggle, toneForStatus } from "@/components/ui";

/** How the mockup lays each collection out: a row table, a card grid, or the
 * numbered FAQ accordion list. */
export type CrudLayout = "table" | "cards" | "faq";

/** What every layout needs: the sorted items and the three row actions. */
export interface ContentListProps {
  items: ContentItem[];
  onEdit: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
  onTogglePublished: (item: ContentItem) => Promise<void>;
}

/** Renders a non-empty collection in the layout its route asks for. */
export function ContentList({ layout, ...props }: ContentListProps & { layout: CrudLayout }) {
  if (layout === "cards") return <ContentCards {...props} />;
  if (layout === "faq") return <ContentFaqList {...props} />;
  return <ContentTable {...props} />;
}

/** The publish switch, named after the item so a screen reader says which one. */
function PublishToggle({
  item,
  onToggle,
}: {
  item: ContentItem;
  onToggle: (item: ContentItem) => Promise<void>;
}) {
  return (
    <Toggle
      checked={item.published}
      onChange={() => void onToggle(item)}
      label={`${item.published ? "Unpublish" : "Publish"} ${item.title?.en || "item"}`}
    />
  );
}

function StatusPill({ published }: { published: boolean }) {
  return <Pill tone={toneForStatus(published ? "published" : "draft")}>{published ? "published" : "draft"}</Pill>;
}

function ContentTable({ items, onEdit, onDelete, onTogglePublished }: ContentListProps) {
  return (
    <DataTable
      columns={[
        { label: "Order", w: "0.5fr" },
        { label: "Title", w: "2.2fr" },
        { label: "Slug", w: "1.2fr" },
        { label: "Status", w: "1fr" },
        { label: "", w: "90px", hideOnMobile: true },
      ]}
      rowKey={(i) => items[i].id}
      rows={items.map((item) => [
        <span key="order" className="font-mono text-caption text-faint">
          {item.order}
        </span>,
        <span key="title" className="block truncate font-semibold">{item.title?.en || "(untitled)"}</span>,
        <span key="slug" className="font-mono block truncate text-caption text-faint">
          {item.slug}
        </span>,
        <div key="status" className="flex items-center gap-2">
          <PublishToggle item={item} onToggle={onTogglePublished} />
          <StatusPill published={item.published} />
        </div>,
        <RowActions key="actions" onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />,
      ])}
    />
  );
}

function ContentCards({ items, onEdit, onDelete, onTogglePublished }: ContentListProps) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}
    >
      {items.map((item, i) => (
        <Card
          key={item.id}
          className="!p-4"
          style={{
            animation: "kfIn .5s cubic-bezier(.22,1,.36,1) both",
            animationDelay: `${Math.min(i, 8) * 0.05}s`,
          }}
        >
          {/* The mockup's `imgBox`: the item's first media file, or a dashed
              placeholder that says where an image would go. */}
          <div
            className="relative overflow-hidden rounded-control border border-dashed"
            style={{ aspectRatio: "16/9", background: "var(--panel2)", borderColor: "var(--bstrong)" }}
          >
            {item.media?.[0] ? (
              <>
                <img src={mediaPreviewUrl(item.media[0])} alt="" className="absolute inset-0 h-full w-full object-cover" />
                {item.media.length > 1 ? (
                  <span
                    className="font-mono absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-label"
                    style={{ background: "rgba(0,0,0,.6)", color: "#fff" }}
                    title={`${item.media.length} images`}
                  >
                    +{item.media.length - 1}
                  </span>
                ) : null}
              </>
            ) : (
              <div
                className="absolute inset-0 grid place-items-center px-3 text-center text-caption text-faint"
              >
                No image yet
              </div>
            )}
          </div>
          <div className="mt-3.5 flex items-center gap-2.5">
            <h3 className="font-display min-w-0 flex-1 truncate text-section font-semibold">
              {item.title?.en || "(untitled)"}
            </h3>
            <StatusPill published={item.published} />
          </div>
          <div className="font-mono mt-1.5 truncate text-caption text-faint">
            /{item.slug}
          </div>
          <p
            className="mt-2 line-clamp-3 min-h-[60px] text-ui leading-[1.55] text-muted"
          >
            {item.summary?.en || item.body?.en || "No summary yet."}
          </p>
          <div className="mt-3.5 flex items-center gap-2">
            <Button className="flex-1" onClick={() => onEdit(item)}>
              Edit
            </Button>
            <PublishToggle item={item} onToggle={onTogglePublished} />
            <RowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function ContentFaqList({ items, onEdit, onDelete, onTogglePublished }: ContentListProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <Card
          key={item.id}
          className="!p-[18px]"
          style={{
            animation: "kfIn .45s cubic-bezier(.22,1,.36,1) both",
            animationDelay: `${Math.min(i, 8) * 0.05}s`,
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="font-mono w-[22px] shrink-0 text-label text-faint">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0 flex-1 text-body font-semibold">
              {item.title?.en || "(untitled)"}
            </div>
            <PublishToggle item={item} onToggle={onTogglePublished} />
            <StatusPill published={item.published} />
            <RowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
          </div>
          <p
            className="mt-2.5 text-ui leading-[1.6] sm:pl-[34px] text-muted"
          >
            {item.summary?.en || item.body?.en || "No answer yet."}
          </p>
        </Card>
      ))}
    </div>
  );
}
