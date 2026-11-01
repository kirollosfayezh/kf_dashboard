import { useEffect, useState } from "react";
import { api } from "@/services/http";
import type { ContentCollection, ContentItem } from "@/services/domain-types";

/** Sorts a collection the way the site shows it: lowest `order` first. */
export function sortByOrder(items: ContentItem[]): ContentItem[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/**
 * One collection's list and the row-level actions on it: load, publish toggle
 * and the confirm-then-delete flow. Every action reloads the list afterwards,
 * so what is shown is always what the server holds.
 */
export function useContentItems(collection: ContentCollection) {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ContentItem | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await api.get<ContentItem[]>(`/admin/content/${collection}`);
      setItems(sortByOrder(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content");
    }
  };

  useEffect(() => {
    setItems(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

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

  return {
    items,
    error,
    setError,
    reload: load,
    togglePublished,
    toDelete,
    requestDelete: setToDelete,
    cancelDelete: () => setToDelete(null),
    confirmDelete,
  };
}
