import { Link, useMatch } from "@tanstack/react-router";
import { ThemeToggle } from "./ThemeToggle";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Icons } from "./icons";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const linkClass =
    "text-[13px] font-medium text-fd-muted-foreground hover:text-fd-foreground transition-colors";
  const mobileLinkClass = "text-sm font-medium text-fd-foreground py-2";

  const isDocsActive = !!useMatch({ from: "/docs/$", shouldThrow: false })();
  const isShowcaseActive = !!useMatch({ from: "/showcase", shouldThrow: false })();
  const isAboutActive = !!useMatch({ from: "/about", shouldThrow: false })();

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-fd-border bg-fd-background/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-6">
        <Link to="/" className="flex flex-col items-start justify-end py-1">
          <img
            src="/swoff-black.svg"
            alt="Swoff"
            className="h-4 w-auto dark:hidden"
          />
          <img
            src="/swoff-white.svg"
            alt="Swoff"
            className="h-4 w-auto hidden dark:block"
          />
          <span className="text-xs font-bold leading-tight text-fd-foreground">
            Swoff
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-5">
          <Link
            to="/docs/$"
            params={{ _splat: "" }}
            className={`${linkClass} ${isDocsActive ? "text-fd-primary" : ""}`}
          >
            Docs
          </Link>
          <Link
            to="/showcase"
            className={`${linkClass} ${isShowcaseActive ? "text-fd-primary" : ""}`}
          >
            Showcase
          </Link>
          <Link
            to="/about"
            className={`${linkClass} ${isAboutActive ? "text-fd-primary" : ""}`}
          >
            About
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-lg text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50 transition-colors cursor-pointer"
            onClick={() =>
              window.open("https://github.com/iamsuudi/swoff", "_blank")
            }
            aria-label="GitHub"
          >
            <Icons.gitHub className="size-4" />
          </button>
          <ThemeToggle />
          <button
            className="md:hidden p-2 rounded-lg text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-fd-border bg-fd-background py-4 px-6 flex flex-col gap-3">
          <Link
            to="/docs/$"
            params={{ _splat: "" }}
            className={`${mobileLinkClass} ${isDocsActive ? "text-fd-primary" : ""}`}
            onClick={() => setIsOpen(false)}
          >
            Docs
          </Link>
          <Link
            to="/showcase"
            className={`${mobileLinkClass} ${isShowcaseActive ? "text-fd-primary" : ""}`}
            onClick={() => setIsOpen(false)}
          >
            Showcase
          </Link>
          <Link
            to="/about"
            className={`${mobileLinkClass} ${isAboutActive ? "text-fd-primary" : ""}`}
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
        </div>
      )}
    </nav>
  );
}