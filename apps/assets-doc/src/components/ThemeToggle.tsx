import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50 transition-colors flex items-center justify-center cursor-pointer"
      aria-label="Toggle theme"
    >
      <Sun className="size-4 hidden dark:inline" />
      <Moon className="size-4 inline dark:hidden" />
    </button>
  );
}
