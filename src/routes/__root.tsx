import { useEffect, useState } from "react";
import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/store/auth";
import { setUnauthorizedHandler } from "@/services/http";
import { Spinner } from "@/components/ui";

export const Route = createRootRoute({
  component: RootComponent,
});

function FullScreenSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
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
        <AppHeader onOpenNav={() => setNavOpen(true)} />
        {/* 18px below 700px / 26px above — the mockup's `main` padding. */}
        <main className="w-full max-w-[1400px] flex-1 p-[18px] md:p-[26px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
