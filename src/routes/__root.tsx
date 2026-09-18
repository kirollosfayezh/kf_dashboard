import { useEffect, useState } from "react";
import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/store/auth";
import { setUnauthorizedHandler } from "@/services/http";
import { Spinner } from "@/components/ui";

export const Route = createRootRoute({
  component: RootComponent,
});

function FullScreenSpinner() {
  return (
    <div className="grid min-h-screen place-items-center" style={{ background: "var(--bg)" }}>
      <Spinner className="h-8 w-8" />
    </div>
  );
}

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginRoute = pathname === "/login";
  const bootstrapped = useAuth((s) => s.bootstrapped);
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  // Validate the stored JWT once on load.
  useEffect(() => {
    void useAuth.getState().bootstrap();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      useAuth.getState().clearSession();
      navigate({ to: "/login", replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!user && !isLoginRoute) {
      navigate({ to: "/login", replace: true });
    }
    if (user && isLoginRoute) {
      navigate({ to: "/", replace: true });
    }
  }, [bootstrapped, user, isLoginRoute, navigate]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (!bootstrapped) return <FullScreenSpinner />;

  if (isLoginRoute) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <Outlet />
      </div>
    );
  }

  if (!user) return <FullScreenSpinner />;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <AppSidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-h-screen flex-col lg:ml-[250px]">
        {/* Mobile/tablet top bar — the sidebar is a drawer below lg. */}
        <header
          className="sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-3 backdrop-blur lg:hidden"
          style={{ borderColor: "var(--border)", background: "var(--navbg)" }}
        >
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setNavOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          >
            <Menu size={18} />
          </button>
          <div
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px]"
            style={{ background: "linear-gradient(135deg,#FF6A00,#FF0080)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 9l-3 3 3 3" />
              <path d="M16 9l3 3-3 3" />
            </svg>
          </div>
          <div className="font-display truncate text-[14.5px] font-bold">KF Tech</div>
        </header>

        <main className="w-full max-w-[1400px] flex-1 p-4 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
