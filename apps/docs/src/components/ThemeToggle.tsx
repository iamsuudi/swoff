import { useTheme } from "fumadocs-ui/provider/base";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg text-white/50 cursor-pointer hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
      aria-label="Toggle theme"
    >
      <Sun className="size-4 hidden dark:inline" />
      <Moon className="size-4 inline dark:hidden text-fd-muted-foreground hover:text-fd-foreground transition-colors" />
    </button>
  );
}
