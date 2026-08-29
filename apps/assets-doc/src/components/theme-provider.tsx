import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
} | null>(null);

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    return stored && ["light", "dark", "system"].includes(stored)
      ? stored
      : "system";
  });

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? getSystemTheme() : theme;

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", resolvedTheme === "dark");
    html.style.colorScheme = resolvedTheme;

    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => {
        const next = mql.matches ? "dark" : "light";
        html.classList.toggle("dark", next === "dark");
        html.style.colorScheme = next;
      };
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
  }, [resolvedTheme, theme]);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem("theme", next);
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
