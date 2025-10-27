import { useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useThemeStore, type Theme } from "../../app/store/theme";

interface ThemeToggleProps {
  variant?: "button" | "dropdown";
  className?: string;
  dropdownPosition?: "top" | "bottom";
  widthFull?: boolean;
  showLabel?: boolean;
}

export function ThemeToggle({
  variant = "button",
  className = "",
  dropdownPosition = "bottom",
  widthFull = false,
  showLabel = true,
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
        className={`p-[0.6vw] rounded-[0.8vw] bg-theme-input border border-white/20 dark:border-white/10 text-theme-primary hover:bg-theme-input-focus hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-[0.15vw] focus:ring-theme-primary/20 ${className}`}
        title={`Current theme: ${currentTheme?.label}`}
      >
        <span className="[&>*]:h-[1vw] [&>*]:w-[1vw]">{currentTheme?.icon}</span>
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`p-[0.6vw] rounded-[0.8vw] flex items-center justify-center bg-theme-form border border-white/20 dark:border-white/10 text-theme-primary hover:bg-theme-input-focus transition-all duration-200 focus:outline-none focus:ring-[0.15vw] focus:ring-theme-primary/20  gap-[0.6vw] ${
          widthFull ? "w-full" : ""
        }`}
        title="Theme options"
      >
        <span className="[&>*]:h-[1vw] [&>*]:w-[1vw]">{currentTheme?.icon}</span>
        <span
          aria-hidden={!showLabel}
          className={`text-[0.85vw] font-medium overflow-hidden transition-all duration-300 ${
            showLabel ? "opacity-100 max-w-[8vw] ml-[0.5vw]" : "opacity-0 max-w-0 ml-0"
          }`}
        >
          {currentTheme?.label}
        </span>
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
                ? "bottom-full mb-[0.5vw] left-[50%] translate-x-[-50%]"
                : "top-full mt-[0.5vw] right-0"
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
                  className={`w-full px-[0.9vw] py-[0.6vw] text-left flex items-center gap-[0.6vw] text-[0.9vw] transition-all duration-200 ${
                    theme === themeOption.value
                      ? "bg-[#b3a1ff] text-[#222222]"
                      : "text-theme-primary hover:bg-theme-input"
                  }`}
                >
                  <span className="[&>*]:h-[1vw] [&>*]:w-[1vw]">{themeOption.icon}</span>
                  <span className="truncate">{themeOption.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
