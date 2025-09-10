export type Theme = "light" | "dark" | "system";

export type ThemeState = {
  theme: Theme;
  isDark: boolean;
};

export type ThemeActions = {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export type ThemeStore = ThemeState & ThemeActions;
