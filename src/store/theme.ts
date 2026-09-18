import { create } from "zustand";

type Theme = "dark" | "light";

function readInitial(): Theme {
  try {
    const stored = localStorage.getItem("kf-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-kf-theme", theme);
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

const initial = readInitial();
apply(initial);

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initial,
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem("kf-theme", next);
    } catch {
      /* ignore */
    }
    set({ theme: next });
  },
}));
