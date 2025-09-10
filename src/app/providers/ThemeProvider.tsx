import { useEffect } from "react";
import { useThemeStore } from "../../app/store/theme";

type Props = { children: React.ReactNode };

export default function ThemeProvider({ children }: Props) {
  const { theme } = useThemeStore();

  useEffect(() => {
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      document.documentElement.setAttribute("data-theme", systemTheme);
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        const newSystemTheme = mediaQuery.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newSystemTheme);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return <>{children}</>;
}
