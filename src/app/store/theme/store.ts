import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme, ThemeActions, ThemeState, ThemeStore } from "./types";
import { applyTheme, getSystemTheme } from "./dom";

const initialState: ThemeState = {
  theme: "system",
  isDark: false,
};

type SetState<T> = {
  (
    partial: T | Partial<T> | ((state: T) => T | Partial<T>),
    replace?: false
  ): void;
  (state: T | ((state: T) => T), replace: true): void;
};

const createActions = (
  set: SetState<ThemeStore>,
  get: () => ThemeStore
): ThemeActions => ({
  setTheme: (theme: Theme) => {
    const isDark =
      theme === "dark" || (theme === "system" && getSystemTheme() === "dark");
    applyTheme(theme);
    set({ theme, isDark });
  },
  toggleTheme: () => {
    const { theme } = get();
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    get().setTheme(newTheme);
  },
});

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createActions(set, get as () => ThemeStore),
    }),
    {
      name: "theme-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          if (typeof window !== "undefined") {
            const mediaQuery = window.matchMedia(
              "(prefers-color-scheme: dark)"
            );
            mediaQuery.addEventListener("change", () => {
              if (state.theme === "system") {
                applyTheme("system");
              }
            });
          }
        }
      },
    }
  )
);
