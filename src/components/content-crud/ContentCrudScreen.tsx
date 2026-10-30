import type { ContentCollection } from "@/services/domain-types";
import {
  AddButton,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorBanner,
  GradientButton,
  SectionHead,
  Spinner,
} from "@/components/ui";
import { EMPTY_FORM, singularFor, toForm } from "./form-model";
import { ContentList, type CrudLayout } from "./ContentList";
import { CONTENT_FORM_ID, ContentEditorForm } from "./ContentEditorForm";
import { useContentEditor } from "./useContentEditor";
import { useContentItems } from "./useContentItems";

export { CMS_LANGS } from "./form-model";
export type { CrudLayout } from "./ContentList";

/**
 * The one generic list + editor + delete screen behind every content
 * collection route (projects, services, FAQs, …). Data lives in
 * `useContentItems`, the editor sheet in `useContentEditor`, and the
 * form <-> API mapping in the pure `form-model.ts`.
 */
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
  const list = useContentItems(collection);
  const { items, error } = list;
  const editor = useContentEditor({ collection, reload: list.reload, setError: list.setError });
  const { form, saving } = editor;

  const singular = singularFor(label, singularLabel);

  return (
    <div className="kf-scr">
      <SectionHead
        title={label}
        subtitle={description}
        action={
          <AddButton onClick={() => editor.open(EMPTY_FORM)}>
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

      {items && items.length > 0 ? (
        <ContentList
          layout={layout}
          items={items}
          onEdit={(item) => editor.open(toForm(item))}
          onDelete={list.requestDelete}
          onTogglePublished={list.togglePublished}
        />
      ) : null}

      {/* The editor is a sheet, not a card appended after the list. It used to
          render below every item with no scroll or focus change, so on a long
          collection tapping Edit appeared to do nothing at all. */}
      <Drawer
        open={!!form}
        onClose={editor.close}
        width="lg"
        title={form?.id ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
        subtitle="Changes apply everywhere this item appears on the site."
        footer={
          <div className="flex gap-2.5">
            <GradientButton type="submit" form={CONTENT_FORM_ID} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </GradientButton>
            <Button type="button" variant="ghost" onClick={editor.close}>
              Cancel
            </Button>
          </div>
        }
      >
        {form ? (
          <ContentEditorForm
            collection={collection}
            form={form}
            setForm={editor.setForm}
            setLink={editor.setLink}
            activeLang={editor.activeLang}
            setActiveLang={editor.setActiveLang}
            onSubmit={editor.save}
          />
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={!!list.toDelete}
        title={`Delete "${list.toDelete?.title?.en ?? ""}"?`}
        body="This cannot be undone."
        onConfirm={() => void list.confirmDelete()}
        onCancel={list.cancelDelete}
      />
    </div>
  );
}
