import { useEffect, useState } from "react";
import { api } from "@/services/http";
import type { ContentCollection, ContentItem } from "@/services/domain-types";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  GradientButton,
  Input,
  Pill,
  SectionHead,
  Spinner,
  Textarea,
  Toggle,
} from "@/components/ui";

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
}: {
  collection: ContentCollection;
  label: string;
  description: string;
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

  return (
    <div className="kf-scr">
      <SectionHead
        title={label}
        subtitle={description}
        action={<GradientButton onClick={() => setForm(EMPTY_FORM)}>+ Add {label.replace(/s$/, "")}</GradientButton>}
      />
      {error ? <ErrorBanner message={error} /> : null}

      {!items && !error ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : null}

      {items && items.length === 0 ? (
        <EmptyState title={`No ${label.toLowerCase()} yet`} body="Add the first item to see it here." />
      ) : null}

      {items && items.length > 0 ? (
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        >
          {/* Column headings only make sense once the rows are actually a grid (md+). */}
          <div
            className="hidden gap-3.5 border-b px-5 py-3 text-[10.5px] tracking-wider md:grid md:grid-cols-[0.6fr_2.4fr_0.9fr_0.9fr_1.4fr]"
            style={{
              borderColor: "var(--border)",
              background: "var(--panel2)",
              color: "var(--text3)",
            }}
          >
            <div className="font-mono">ORDER</div>
            <div className="font-mono">TITLE</div>
            <div className="font-mono">SLUG</div>
            <div className="font-mono">PUBLISHED</div>
            <div className="font-mono text-right">ACTIONS</div>
          </div>
          {items.map((item, i) => (
            <div
              key={item.id}
              className="kf-row flex flex-col gap-2.5 px-4 py-3.5 text-[14px] md:grid md:grid-cols-[0.6fr_2.4fr_0.9fr_0.9fr_1.4fr] md:items-center md:gap-3.5 md:px-5"
              style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 md:hidden">
                  <span className="font-mono text-[12px]" style={{ color: "var(--text3)" }}>
                    #{item.order}
                  </span>
                  <span className="truncate font-semibold">{item.title?.en || "(untitled)"}</span>
                </div>
                <div className="font-mono hidden md:block" style={{ color: "var(--text3)" }}>
                  {item.order}
                </div>
              </div>
              <div className="hidden truncate font-semibold md:block">
                {item.title?.en || "(untitled)"}
              </div>
              <div className="font-mono truncate text-[12.5px]" style={{ color: "var(--text2)" }}>
                {item.slug}
              </div>
              <div className="flex items-center gap-2">
                <Toggle on={item.published} onClick={() => void togglePublished(item)} />
                <Pill text={item.published ? "published" : "draft"} />
              </div>
              <div className="flex gap-2 md:justify-end">
                <Button onClick={() => setForm(toForm(item))}>Edit</Button>
                <Button variant="danger" onClick={() => setToDelete(item)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {form ? (
        <div className="mt-6">
          <Card>
            <h3 className="font-display mb-4 text-[16px] font-semibold">
              {form.id ? `Edit ${label.replace(/s$/, "")}` : `New ${label.replace(/s$/, "")}`}
            </h3>
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
