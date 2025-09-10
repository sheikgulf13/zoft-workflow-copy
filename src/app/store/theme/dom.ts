import type { Theme } from "./types";

export const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const applyTheme = (theme: Theme): void => {
  if (typeof document === "undefined") return;

  const isDark =
    theme === "dark" || (theme === "system" && getSystemTheme() === "dark");

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(isDark ? "dark" : "light");
  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "dark" : "light"
  );
};
