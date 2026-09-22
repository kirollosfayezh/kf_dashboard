import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/services/http";
import type { MediaItem } from "@/services/domain-types";
import { ImagePlus } from "lucide-react";
import {
  AddButton,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  GradientButton,
  SectionHead,
  Spinner,
} from "@/components/ui";

export const Route = createFileRoute("/media")({
  component: MediaPage,
});

function MediaPage() {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<MediaItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /** `navigator.clipboard` needs a secure context and can be blocked outright,
   *  so fall back to a throwaway textarea rather than failing silently. */
  const copyUrl = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
    } catch {
      const el = document.createElement("textarea");
      el.value = item.url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((c) => (c === item.id ? null : c)), 1600);
  };

  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await api.get<MediaItem[]>("/admin/media");
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load media");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      await api.post("/admin/media", body);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/admin/media/${toDelete.id}`);
      setToDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete media");
    }
  };

  return (
    <div className="kf-scr">
      <SectionHead
        title="Media"
        subtitle="Images and files used across content, settings and the site's own pages."
        action={
          <label>
            <input ref={fileInput} type="file" className="hidden" onChange={onUpload} disabled={uploading} />
            <AddButton disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? "Uploading…" : "Upload file"}
            </AddButton>
          </label>
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
          icon={<ImagePlus size={24} />}
          title="No media yet"
          body="Drop in a logo, a cover photo or a service image and it becomes available to every screen that takes a URL."
          action={
            <GradientButton type="button" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading ? "Uploading…" : "Upload a file"}
            </GradientButton>
          }
        />
      ) : null}
      {items && items.length > 0 ? (
        <div
          className="grid gap-3 sm:gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))" }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border"
              style={{ borderColor: "var(--border)", background: "var(--panel)" }}
            >
              <div
                className="relative aspect-square"
                style={{ background: "var(--panel2)" }}
              >
                {item.contentType?.startsWith("image/") ? (
                  <img src={item.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div
                    className="absolute inset-0 grid place-items-center px-3 text-center text-[12px]"
                    style={{ color: "var(--text3)" }}
                  >
                    {item.contentType}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5">
                <div className="truncate font-mono text-[11px]" style={{ color: "var(--text3)" }}>
                  {(item.size / 1024).toFixed(0)} KB
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Site settings tells people to "paste a URL from Media", but
                      the URL was never shown or copyable here — this is the other
                      half of that instruction. */}
                  <button
                    onClick={() => void copyUrl(item)}
                    className="text-[12px] font-semibold"
                    style={{ color: copiedId === item.id ? "#4ADE80" : "var(--text2)" }}
                    title={item.url}
                  >
                    {copiedId === item.id ? "Copied" : "Copy URL"}
                  </button>
                  <button
                    onClick={() => setToDelete(item)}
                    className="text-[12px] font-semibold"
                    style={{ color: "#FF6A9E" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this file?"
        body="This cannot be undone."
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
