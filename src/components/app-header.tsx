import { ExternalLink, Menu, Moon, Sun } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useTheme } from "@/store/theme";
import { SCREEN_TITLES } from "@/components/app-sidebar";

/**
 * The mockup's sticky top bar, present at every breakpoint: a hamburger below
 * `lg`, the `DASHBOARD / SCREEN` crumb over the screen title, then the theme
 * toggle and a gradient action button.
 *
 * The mockup's action is a global "Save changes" — the real dashboard saves per
 * screen (each form owns its own submit), so that slot carries "View live site"
 * instead rather than a button that would do nothing.
 */
export function AppHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const title = SCREEN_TITLES[pathname] ?? "Dashboard";

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-4 border-b px-4 py-3 backdrop-blur-[16px] sm:px-[26px] sm:py-[14px]"
      style={{ borderColor: "var(--border)", background: "var(--navbg)" }}
    >
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenNav}
        className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border lg:hidden"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <Menu size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10.5px] tracking-[.08em]" style={{ color: "var(--text3)" }}>
          DASHBOARD / {title.toUpperCase()}
        </div>
        <h1 className="font-display truncate text-[19px] font-semibold tracking-[-.01em]">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-[9px]">
        <button
          type="button"
          onClick={toggle}
          title="Toggle theme"
          aria-label="Toggle theme"
          className="grid h-[38px] w-[38px] place-items-center rounded-[10px] border transition-colors"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <a
          href={import.meta.env.VITE_SITE_URL ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 whitespace-nowrap rounded-[10px] px-[17px] py-2.5 text-[13.5px] font-semibold text-white transition-transform hover:-translate-y-px"
          style={{ background: "linear-gradient(135deg,#FF6A00,#FF0080)", color: "#fff" }}
        >
          <ExternalLink size={15} />
          <span className="hidden sm:inline">View live site</span>
          <span className="sm:hidden">Site</span>
        </a>
      </div>
    </header>
  );
}
