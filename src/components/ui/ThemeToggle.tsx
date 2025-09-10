import { useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useThemeStore, type Theme } from "../../app/store/theme";

interface ThemeToggleProps {
  variant?: "button" | "dropdown";
  className?: string;
  dropdownPosition?: "top" | "bottom";
  widthFull?: boolean;
}

export function ThemeToggle({
  variant = "button",
  className = "",
  dropdownPosition = "bottom",
  widthFull = false,
}: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useThemeStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun size={16} /> },
    { value: "dark", label: "Dark", icon: <Moon size={16} /> },
    { value: "system", label: "System", icon: <Monitor size={16} /> },
  ];

  const currentTheme = themes.find((t) => t.value === theme);

  if (variant === "button") {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2.5 rounded-2xl bg-theme-input border border-white/20 dark:border-white/10 text-theme-primary hover:bg-theme-input-focus hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary/20 ${className}`}
        title={`Current theme: ${currentTheme?.label}`}
      >
        {currentTheme?.icon}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`p-2.5 rounded-2xl flex items-center justify-center bg-theme-form border border-white/20 dark:border-white/10 text-theme-primary hover:bg-theme-input-focus transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary/20  gap-2 ${
          widthFull ? "w-full" : ""
        }`}
        title="Theme options"
      >
        {currentTheme?.icon}
        <span className="text-sm font-medium">{currentTheme?.label}</span>
      </button>

      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />

          {/* Dropdown */}
          <div
            className={`absolute w-48 overflow-hidden bg-theme-input backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-xl z-20 ${
              dropdownPosition === "top"
                ? "bottom-full mb-2 left-[50%] translate-x-[-50%]"
                : "top-full mt-2 right-0"
            }`}
          >
            <div className="py-0">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.value}
                  onClick={() => {
                    setTheme(themeOption.value);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 text-sm transition-all duration-200 ${
                    theme === themeOption.value
                      ? "bg-[#b3a1ff] text-[#222222]"
                      : "text-theme-primary hover:bg-theme-input"
                  }`}
                >
                  {themeOption.icon}
                  {themeOption.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
