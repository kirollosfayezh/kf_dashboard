import { useEffect, useState } from "react";
import { api } from "@/services/http";
import type { ContentCollection, ContentItem } from "@/services/domain-types";
import {
  AddButton,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  Field,
  GradientButton,
  Input,
  PanelHead,
  Pill,
  RowActions,
  SectionHead,
  Spinner,
  Textarea,
  Toggle,
} from "@/components/ui";

/** How the mockup lays each collection out: a row table, a card grid, or the
 * numbered FAQ accordion list. */
export type CrudLayout = "table" | "cards" | "faq";

interface FormState {
  id?: string;
  slug: string;
  published: boolean;
  order: number;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  bodyEn: string;
  bodyAr: string;
}

const EMPTY_FORM: FormState = {
  slug: "",
  published: false,
  order: 0,
  titleEn: "",
  titleAr: "",
  summaryEn: "",
  summaryAr: "",
  bodyEn: "",
  bodyAr: "",
};

function toForm(item: ContentItem): FormState {
  return {
    id: item.id,
    slug: item.slug,
    published: item.published,
    order: item.order,
    titleEn: item.title?.en ?? "",
    titleAr: item.title?.ar ?? "",
    summaryEn: item.summary?.en ?? "",
    summaryAr: item.summary?.ar ?? "",
    bodyEn: item.body?.en ?? "",
    bodyAr: item.body?.ar ?? "",
  };
}

function toPayload(form: FormState) {
  return {
    slug: form.slug.trim(),
    published: form.published,
    order: Number(form.order) || 0,
    title: { en: form.titleEn, ar: form.titleAr },
    summary: { en: form.summaryEn, ar: form.summaryAr },
    body: { en: form.bodyEn, ar: form.bodyAr },
  };
}

export function ContentCrudScreen({
  collection,
  label,
  description,
  layout = "table",
  addLabel,
  singularLabel,
}: {
  collection: ContentCollection;
  label: string;
  description: string;
  layout?: CrudLayout;
  /** Overrides the derived "Add <singular>" wording (e.g. "Add question"). */
  addLabel?: string;
  /** Overrides the singular used in the editor heading and empty state. */
  singularLabel?: string;
}) {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ContentItem | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await api.get<ContentItem[]>(`/admin/content/${collection}`);
      setItems([...data].sort((a, b) => a.order - b.order));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content");
    }
  };

  useEffect(() => {
    setItems(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (form.id) {
        await api.patch(`/admin/content/${collection}/${form.id}`, payload);
      } else {
        await api.post(`/admin/content/${collection}`, payload);
      }
      setForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (item: ContentItem) => {
    try {
      await api.patch(`/admin/content/${collection}/${item.id}`, { published: !item.published });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update item");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/admin/content/${collection}/${toDelete.id}`);
      setToDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete item");
    }
  };

  const singular = singularLabel ?? (label === "FAQ" ? "Question" : label.replace(/s$/, ""));

  return (
    <div className="kf-scr">
      <SectionHead
        title={label}
        subtitle={description}
        action={
          <AddButton onClick={() => setForm(EMPTY_FORM)}>
            {addLabel ?? `Add ${singular.toLowerCase()}`}
          </AddButton>
        }
      />
      {error ? <ErrorBanner message={error} /> : null}

      {!items && !error ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : null}

      {items && items.length === 0 ? (
        <EmptyState
          title={`No ${label.toLowerCase()} yet`}
          body={`Add the first ${singular.toLowerCase()} and it will appear here — and on the site as soon as you publish it.`}
        />
      ) : null}

      {items && items.length > 0 && layout === "table" ? (
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
            <span className="font-mono text-[12.5px]" style={{ color: "var(--text3)" }}>
              {item.order}
            </span>,
            <span className="block truncate font-semibold">{item.title?.en || "(untitled)"}</span>,
            <span className="font-mono block truncate text-[12px]" style={{ color: "var(--text3)" }}>
              {item.slug}
            </span>,
            <div className="flex items-center gap-2">
              <Toggle on={item.published} onClick={() => void togglePublished(item)} />
              <Pill text={item.published ? "published" : "draft"} />
            </div>,
            <RowActions onEdit={() => setForm(toForm(item))} onDelete={() => setToDelete(item)} />,
          ])}
        />
      ) : null}

      {items && items.length > 0 && layout === "cards" ? (
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
                className="relative overflow-hidden rounded-[11px] border border-dashed"
                style={{ aspectRatio: "16/9", background: "var(--panel2)", borderColor: "var(--bstrong)" }}
              >
                {item.media?.[0] ? (
                  <img src={item.media[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div
                    className="absolute inset-0 grid place-items-center px-3 text-center text-[12.5px]"
                    style={{ color: "var(--text3)" }}
                  >
                    No image yet
                  </div>
                )}
              </div>
              <div className="mt-3.5 flex items-center gap-2.5">
                <h3 className="font-display min-w-0 flex-1 truncate text-[16px] font-semibold">
                  {item.title?.en || "(untitled)"}
                </h3>
                <Pill text={item.published ? "published" : "draft"} />
              </div>
              <div className="font-mono mt-1.5 truncate text-[11.5px]" style={{ color: "var(--text3)" }}>
                /{item.slug}
              </div>
              <p
                className="mt-2 line-clamp-3 min-h-[60px] text-[13.5px] leading-[1.55]"
                style={{ color: "var(--text2)" }}
              >
                {item.summary?.en || item.body?.en || "No summary yet."}
              </p>
              <div className="mt-3.5 flex items-center gap-2">
                <Button className="flex-1" onClick={() => setForm(toForm(item))}>
                  Edit
                </Button>
                <Toggle on={item.published} onClick={() => void togglePublished(item)} />
                <RowActions onEdit={() => setForm(toForm(item))} onDelete={() => setToDelete(item)} />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {items && items.length > 0 && layout === "faq" ? (
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
                <div className="font-mono w-[22px] shrink-0 text-[11px]" style={{ color: "var(--text3)" }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1 text-[15px] font-semibold">
                  {item.title?.en || "(untitled)"}
                </div>
                <Toggle on={item.published} onClick={() => void togglePublished(item)} />
                <Pill text={item.published ? "published" : "draft"} />
                <RowActions onEdit={() => setForm(toForm(item))} onDelete={() => setToDelete(item)} />
              </div>
              <p
                className="mt-2.5 text-[13.5px] leading-[1.6] sm:pl-[34px]"
                style={{ color: "var(--text2)" }}
              >
                {item.summary?.en || item.body?.en || "No answer yet."}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {form ? (
        <div className="mt-6">
          <Card>
            <PanelHead
              title={form.id ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
              subtitle="Changes apply everywhere this item appears on the site."
            />
            <form onSubmit={save}>
              <div className="grid gap-x-5 md:grid-cols-2">
                <Field label="Slug">
                  <Input
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="my-item-slug"
                  />
                </Field>
                <Field label="Order">
                  <Input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Title (EN)">
                  <Input
                    required
                    value={form.titleEn}
                    onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                  />
                </Field>
                <Field label="Title (AR)">
                  <Input
                    dir="rtl"
                    value={form.titleAr}
                    onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
                  />
                </Field>
                <Field label="Summary (EN)">
                  <Textarea
                    rows={3}
                    value={form.summaryEn}
                    onChange={(e) => setForm({ ...form, summaryEn: e.target.value })}
                  />
                </Field>
                <Field label="Summary (AR)">
                  <Textarea
                    dir="rtl"
                    rows={3}
                    value={form.summaryAr}
                    onChange={(e) => setForm({ ...form, summaryAr: e.target.value })}
                  />
                </Field>
                <Field label="Body (EN)">
                  <Textarea
                    rows={6}
                    value={form.bodyEn}
                    onChange={(e) => setForm({ ...form, bodyEn: e.target.value })}
                  />
                </Field>
                <Field label="Body (AR)">
                  <Textarea
                    dir="rtl"
                    rows={6}
                    value={form.bodyAr}
                    onChange={(e) => setForm({ ...form, bodyAr: e.target.value })}
                  />
                </Field>
              </div>
              <label className="mb-4 flex items-center gap-2.5 text-[13.5px] font-medium">
                <Toggle on={form.published} onClick={() => setForm({ ...form, published: !form.published })} />
                Published
              </label>
              <div className="flex gap-2.5">
                <GradientButton type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </GradientButton>
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete "${toDelete?.title?.en ?? ""}"?`}
        body="This cannot be undone."
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
