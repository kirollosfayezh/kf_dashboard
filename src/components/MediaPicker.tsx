import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, Trash2, Upload, X } from "lucide-react";
import { api } from "@/services/http";
import type { MediaItem } from "@/services/domain-types";
import { Button, ErrorBanner, Spinner } from "@/components/ui";

/**
 * Picks images for a content item: upload a new file, or choose one already in
 * the Media library.
 *
 * Until now the editor had no way to set `media` at all, so anything created in
 * the dashboard was permanently image-less — the card grid just showed
 * "No image yet" forever. The library screen could upload but never surfaced the
 * resulting URL, so the two halves of the job could not be joined up.
 *
 * Works on the whole `media` array rather than only the first entry. Every page
 * on the site currently reads `media[0]`, but the field has always been a list,
 * and ordering here decides which image that is.
 */

/** Mirrors the server allowlist in `kf_backend/src/routes/admin/media.routes.ts`.
 *  SVG is deliberately excluded there, so it is excluded here too. */
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

export function MediaPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const [library, setLibrary] = useState<MediaItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || tab !== "library" || library) return;
    api
      .get<MediaItem[]>("/admin/media")
      .then(setLibrary)
      .catch((e: Error) => setError(e.message || "Failed to load the media library"));
  }, [open, tab, library]);

  const add = (url: string) => {
    if (!url || value.includes(url)) return;
    onChange([...value, url]);
  };

  const upload = async (file: File) => {
    // Checked here as well as on the server: a 10 MB+ file otherwise travels all
    // the way up before being rejected.
    if (file.size > MAX_BYTES) {
      setError(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 10 MB.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      // Keep the created item: it carries the URL, which the Media screen used
      // to throw away before re-listing.
      const created = await api.post<MediaItem>("/admin/media", body);
      add(created.url);
      setLibrary(null); // force a refresh next time the library tab opens
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="mb-4">
      <div className="mb-1.5 text-caption font-semibold text-muted">
        Images
      </div>

      {value.length ? (
        <div className="mb-2.5 flex flex-col gap-2">
          {value.map((url, i) => (
            <div
              key={url}
              className="flex items-center gap-2.5 rounded-control border p-2 border-line bg-raised"
            >
              <img
                src={url}
                alt=""
                className="h-11 w-11 shrink-0 rounded-xs object-cover bg-panel"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.25";
                }}
              />
              <span className="font-mono min-w-0 flex-1 truncate text-caption text-faint">
                {url}
              </span>
              {i === 0 ? (
                <span
                  className="font-mono shrink-0 rounded-full px-2 py-0.5 text-label tracking-[.06em]"
                  style={{ background: "rgba(255,106,0,.14)", color: "#FF9A4D" }}
                  title="The image the site shows for this item"
                >
                  MAIN
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  className="shrink-0 rounded-xs border px-2 py-1 text-label border-line text-muted"
                  title="Make this the main image"
                >
                  ↑
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== url))}
                aria-label="Remove image"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xs border border-line text-faint"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="mb-2.5 grid place-items-center gap-1 rounded-control border border-dashed py-6 text-center border-line-strong bg-raised"
        >
          <ImagePlus size={18} className="text-faint" />
          <div className="text-ui text-faint">
            No image yet
          </div>
        </div>
      )}

      <Button type="button" variant="ghost" onClick={() => setOpen((o) => !o)}>
        {open ? "Close" : value.length ? "Add another image" : "Add an image"}
      </Button>

      {open ? (
        <div
          className="mt-2.5 rounded-control border p-3 border-line bg-raised"
        >
          <div className="mb-3 flex overflow-hidden rounded-control border border-line">
            {(["upload", "library"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-caption font-semibold capitalize"
                style={{
                  background: tab === t ? "rgba(255,106,0,.12)" : "transparent",
                  color: tab === t ? "var(--text)" : "var(--text2)",
                }}
              >
                {t === "upload" ? <Upload size={13} /> : <Link2 size={13} />}
                {t}
              </button>
            ))}
          </div>

          {error ? <ErrorBanner message={error} /> : null}

          {tab === "upload" ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
              <Button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
                {busy ? "Uploading…" : "Choose a file"}
              </Button>
              <p className="mt-2 text-caption text-faint">
                JPEG, PNG, WebP, GIF, AVIF, MP4 or PDF — up to 10 MB. SVG is not accepted.
              </p>
            </div>
          ) : library ? (
            library.length ? (
              <div
                className="grid max-h-[260px] gap-2 overflow-y-auto"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 96px), 1fr))" }}
              >
                {library.map((m) => {
                  const chosen = value.includes(m.url);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => (chosen ? onChange(value.filter((u) => u !== m.url)) : add(m.url))}
                      className="relative aspect-square overflow-hidden rounded-control border"
                      style={{ borderColor: chosen ? "#FF6A00" : "var(--border)" }}
                      title={m.url}
                    >
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                      {chosen ? (
                        <span
                          className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full text-label"
                          style={{ background: "#FF6A00", color: "#fff" }}
                        >
                          <X size={11} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-ui text-faint">
                Nothing in the library yet — upload a file first.
              </p>
            )
          ) : (
            <div className="grid place-items-center py-6">
              <Spinner className="h-6 w-6" />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
