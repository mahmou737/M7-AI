import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  isRtl?: boolean;
}

export function ThemeToggle({ className, showLabel = false, isRtl = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={cn(
        "relative flex items-center justify-center gap-2 p-2 rounded-xl transition-all duration-200",
        isDark
          ? "bg-white/5 hover:bg-white/10 text-amber-400 hover:text-amber-300 border border-white/10"
          : "bg-slate-100 hover:bg-slate-200 text-amber-600 hover:text-amber-700 border border-slate-300 shadow-sm",
        className
      )}
      title={
        isDark
          ? isRtl
            ? "التبديل إلى الوضع الفاتح"
            : "Switch to Light Mode"
          : isRtl
            ? "التبديل إلى الوضع الداكن"
            : "Switch to Dark Mode"
      }
      aria-label="Toggle Theme"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 transition-transform duration-300 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 transition-transform duration-300 hover:-rotate-12" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-semibold select-none">
          {isDark
            ? isRtl
              ? "فاتح"
              : "Light"
            : isRtl
              ? "داكن"
              : "Dark"}
        </span>
      )}
    </button>
  );
}
