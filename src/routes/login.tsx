import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/store/auth";
import { GradientButton, Input } from "@/components/ui";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await login(email, password);
    setSubmitting(false);
    if (!res.ok) setError(res.error ?? "Sign-in failed");
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 0%, rgba(255,106,0,.14), transparent 60%), radial-gradient(60% 50% at 80% 100%, rgba(255,0,128,.1), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-[420px] rounded-[22px] border p-6 sm:p-9"
        style={{
          borderColor: "var(--border)",
          background: "var(--panel)",
          boxShadow: "0 40px 90px -50px rgba(0,0,0,.8)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-[38px] w-[38px] place-items-center rounded-[11px]"
            style={{ background: "linear-gradient(135deg,#FF6A00,#FF0080)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 9l-3 3 3 3" />
              <path d="M16 9l3 3-3 3" />
            </svg>
          </div>
          <div>
            <div className="font-display text-[16px] font-bold tracking-tight">KF Tech Solutions</div>
            <div className="font-mono text-[10.5px] tracking-wider" style={{ color: "var(--text3)" }}>
              CONTROL PANEL
            </div>
          </div>
        </div>

        <h1 className="font-display mt-7 text-[27px] font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-[14.5px]" style={{ color: "var(--text2)" }}>
          Manage content, analytics and enquiries for your site.
        </p>

        <div className="mt-6">
          <label className="mb-2 block text-[12.5px] font-semibold" style={{ color: "var(--text2)" }}>
            Email
          </label>
          <Input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@kftech.com"
          />
        </div>
        <div className="mt-[18px]">
          <label className="mb-2 block text-[12.5px] font-semibold" style={{ color: "var(--text2)" }}>
            Password
          </label>
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <div
            className="mt-4 rounded-[10px] border px-3.5 py-2.5 text-[13.5px]"
            style={{ background: "rgba(255,0,128,.12)", borderColor: "rgba(255,0,128,.3)", color: "#FF6A9E" }}
          >
            {error}
          </div>
        ) : null}

        <GradientButton type="submit" disabled={submitting} className="mt-5 w-full py-3.5 text-[15.5px]">
          {submitting ? "Signing in…" : "Sign in"}
        </GradientButton>
      </form>
    </div>
  );
}
