import { useEffect, useRef, useState } from "react";
import { ExternalLink, Trash2, Upload } from "lucide-react";
import { Button, Callout, Toggle } from "@/components/ui";
import { ApiError } from "@/services/http";
import { demoPublicUrl, demos, type DemoSummary } from "@/services/demos";
import type { FormState, MetaTextField } from "./form-model";

/**
 * Projects only: the concept flag and the demo website behind the "Live demo"
 * button. The demo is one HTML file stored by the API under the project's slug
 * and opened at <site>/demos/<slug>; uploading it fills in the demo link, which
 * is saved with the project as usual.
 */
export function DemoFields({
  form,
  setForm,
  setLink,
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  setLink: (key: MetaTextField, value: string) => void;
}) {
  const slug = form.slug.trim();
  const [demo, setDemo] = useState<DemoSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  // Only a saved slug can have a demo; while the slug is being typed, wait.
  const savedSlug = form.id ? slug : "";
  useEffect(() => {
    setDemo(null);
    setError(null);
    if (!savedSlug) return;
    let live = true;
    demos
      .get(savedSlug)
      .then((d) => live && setDemo(d))
      .catch((e) => live && !(e instanceof ApiError && e.status === 404) && setError(e.message));
    return () => {
      live = false;
    };
  }, [savedSlug]);

  async function upload(f: File) {
    setBusy(true);
    setError(null);
    try {
      const saved = await demos.upload(slug, await f.text());
      setDemo(saved);
      setLink("demoUrl", demoPublicUrl(slug));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await demos.remove(slug);
      setDemo(null);
      if (form.links.demoUrl === demoPublicUrl(slug)) setLink("demoUrl", "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  const concept = form.meta.concept === true;
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4 rounded-control border border-line px-3.5 py-3">
        <div>
          <div className="text-ui font-semibold">Concept demo (made-up business, not a client)</div>
          <div className="mt-0.5 text-caption text-faint">
            {concept
              ? "Listed under “Concept demos” on /projects with a Concept badge, kept off the homepage."
              : "Listed as client work."}
          </div>
        </div>
        <Toggle
          checked={concept}
          onChange={() => setForm({ ...form, meta: { ...form.meta, concept: !concept } })}
          label="Concept demo (made-up business, not a client)"
        />
      </div>

      <div className="mb-4 rounded-control border border-line px-3.5 py-3">
        <div className="text-ui font-semibold">Demo website</div>
        {!savedSlug ? (
          <div className="mt-0.5 text-caption text-faint">
            Save the project first; the demo is stored under its slug.
          </div>
        ) : (
          <>
            <div className="mt-0.5 text-caption text-faint">
              {demo ? (
                <>
                  Live at <span className="font-mono text-muted">{demoPublicUrl(slug)}</span> ·{" "}
                  {Math.max(1, Math.round(demo.size / 1024))} KB · updated{" "}
                  {new Date(demo.updatedAt).toLocaleString()}
                </>
              ) : (
                <>
                  Upload one self-contained <span className="font-mono">index.html</span> (photos linked
                  from the web, up to 1 MB). It opens at{" "}
                  <span className="font-mono text-muted">{demoPublicUrl(slug)}</span> in a sealed
                  sandbox, with a “Concept demo by KF Tech Solutions” note and hidden from Google.
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                ref={file}
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
              <Button size="sm" icon={<Upload size={14} />} loading={busy} onClick={() => file.current?.click()}>
                {demo ? "Replace file" : "Upload index.html"}
              </Button>
              {demo ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<ExternalLink size={14} />}
                    onClick={() => window.open(demoPublicUrl(slug), "_blank", "noopener")}
                  >
                    Open demo
                  </Button>
                  <Button size="sm" variant="danger" icon={<Trash2 size={14} />} disabled={busy} onClick={remove}>
                    Remove
                  </Button>
                </>
              ) : null}
            </div>
            {demo && form.links.demoUrl !== demoPublicUrl(slug) ? (
              <div className="mt-2 text-caption text-faint">
                The Live demo URL above points elsewhere.{" "}
                <button
                  type="button"
                  className="font-semibold text-ink underline"
                  onClick={() => setLink("demoUrl", demoPublicUrl(slug))}
                >
                  Use this demo
                </button>
              </div>
            ) : null}
          </>
        )}
        {error ? (
          <Callout tone="danger" className="mt-3">
            {error}
          </Callout>
        ) : null}
      </div>
    </>
  );
}
