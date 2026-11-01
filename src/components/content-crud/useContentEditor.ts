import { useState, type FormEvent } from "react";
import { api } from "@/services/http";
import type { ContentCollection } from "@/services/domain-types";
import { toPayload, type FormState, type LangCode, type MetaTextField } from "./form-model";

/**
 * The editor sheet's state: which item is open (`null` when closed), the
 * language tab, and the save round-trip. A new item POSTs; an existing one
 * PATCHes by id. Errors go to the screen's banner through `setError`.
 */
export function useContentEditor({
  collection,
  reload,
  setError,
}: {
  collection: ContentCollection;
  reload: () => Promise<void>;
  setError: (message: string | null) => void;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [activeLang, setActiveLang] = useState<LangCode>("en");
  const [saving, setSaving] = useState(false);

  const setLink = (key: MetaTextField, value: string) =>
    setForm((f) => (f ? { ...f, links: { ...f.links, [key]: value } } : f));

  /** Opens the sheet on `next`, always starting on the English tab. */
  const open = (next: FormState) => {
    setActiveLang("en");
    setForm(next);
  };

  const close = () => setForm(null);

  const save = async (e: FormEvent) => {
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
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  return { form, setForm, setLink, activeLang, setActiveLang, saving, open, close, save };
}
