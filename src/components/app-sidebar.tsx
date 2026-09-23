import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  LayoutDashboard,
  Inbox,
  MessageCircle,
  Briefcase,
  FolderKanban,
  Layers,
  Newspaper,
  Quote,
  HelpCircle,
  User2,
  Scale,
  Images,
  Settings,
  LogOut,
  ExternalLink,
  X,
  Search,
  Megaphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { api } from "@/services/http";
import type { Lead } from "@/services/domain-types";
import { cn } from "@/lib/utils";

/** Groups and order follow the mockup's `nav` array; Analytics sits directly
 * under Dashboard in OVERVIEW. Screens the mockup has but this build has no
 * backend for (SEO, Marketing & pixels, Media buying) are omitted — their real
 * fields live in Site settings. */
const NAV: { group: string; items: { to: string; label: string; icon: React.ElementType }[] }[] = [
  {
    group: "OVERVIEW",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/inbox", label: "Inbox", icon: Inbox },
      { to: "/chat", label: "Live chat", icon: MessageCircle },
    ],
  },
  {
    group: "CONTENT",
    items: [
      { to: "/services", label: "Services", icon: Briefcase },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/solutions", label: "Solutions", icon: Layers },
      { to: "/blogPosts", label: "Articles", icon: Newspaper },
      { to: "/testimonials", label: "Testimonials", icon: Quote },
      { to: "/faqs", label: "FAQ", icon: HelpCircle },
      { to: "/aboutSections", label: "About / founder", icon: User2 },
      { to: "/legalPages", label: "Legal pages", icon: Scale },
      { to: "/promos", label: "Offers & popup", icon: Megaphone },
    ],
  },
  {
    group: "CONFIGURATION",
    items: [
      { to: "/seo", label: "SEO", icon: Search },
      { to: "/marketing", label: "Marketing", icon: Megaphone },
      { to: "/media", label: "Media", icon: Images },
      { to: "/settings", label: "Site settings", icon: Settings },
    ],
  },
];

/** Route → header title, mirroring the mockup's `titles` map. */
export const SCREEN_TITLES: Record<string, string> = Object.fromEntries([
  ...NAV.flatMap((s) => s.items.map((i) => [i.to, i.label])),
]);

/**
 * Fixed rail from `lg` up; below that it's an off-canvas drawer the top bar's
 * hamburger opens (`open` / `onClose` are owned by the root route).
 */
export function AppSidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logout = useAuth((s) => s.logout);
  const user = useAuth((s) => s.user);
  const [newLeads, setNewLeads] = useState(0);

  // Mirrors the mockup's Inbox badge with a real count. Refreshed on navigation
  // so acting on a lead updates the badge without a reload.
  useEffect(() => {
    let cancelled = false;
    api
      .get<Lead[]>("/admin/leads?status=new")
      .then((leads) => {
        if (!cancelled) setNewLeads(leads.length);
      })
      .catch(() => {
        /* the screen itself surfaces API failures; the badge just stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <>
      {/* Scrim — only rendered while the mobile drawer is open. */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/55 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn("border-line bg-panel", 
          "fixed left-0 top-0 z-50 flex h-screen w-[250px] max-w-[85vw] flex-col border-r transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
      <div className="flex items-center gap-2.5 border-b px-[18px] py-5 border-line">
        <div
          className="grid h-[33px] w-[33px] shrink-0 place-items-center rounded-control bg-brand"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 9l-3 3 3 3" />
            <path d="M16 9l3 3-3 3" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display whitespace-nowrap text-body font-bold">KF Tech</div>
          <div className="font-mono text-label tracking-wider text-faint">
            CONTROL PANEL
          </div>
        </div>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="shrink-0 lg:hidden text-faint"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3.5">
        {NAV.map((section) => (
          <div key={section.group}>
            <div
              className="font-mono px-3 pb-1.5 pt-4 text-label tracking-[.12em] text-faint"
            >
              {section.group}
            </div>
            {section.items.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "mb-0.5 flex items-center gap-2.5 rounded-control border px-3 py-2.5 text-ui font-medium transition-colors",
                    active && "font-semibold",
                  )}
                  style={{
                    borderColor: active ? "rgba(255,106,0,.35)" : "transparent",
                    background: active
                      ? "linear-gradient(135deg,rgba(255,106,0,.16),rgba(255,0,128,.1))"
                      : "transparent",
                    color: active ? "var(--text)" : "var(--text2)",
                  }}
                >
                  <Icon size={17} className="shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.to === "/inbox" && newLeads > 0 ? (
                    <span
                      className="font-mono rounded-full px-[7px] py-[2px] text-label text-white bg-brand"
                    >
                      {newLeads}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t p-3 border-line">
        <a
          href={import.meta.env.VITE_SITE_URL ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-control px-3 py-2.5 text-ui text-muted"
        >
          <ExternalLink size={16} />
          View live site
        </a>
        <div
          className="flex items-center gap-2.5 rounded-control border p-2.5 border-line bg-raised"
        >
          <div
            className="grid h-[29px] w-[29px] shrink-0 place-items-center rounded-full text-caption font-bold text-white bg-brand"
          >
            KF
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-caption font-semibold">
              {user?.name || user?.email || "Admin"}
            </div>
            <div className="text-label text-faint">
              Administrator
            </div>
          </div>
          <button
            title="Sign out"
            aria-label="Sign out"
            onClick={() => logout()} className="text-faint"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
