import { CommandBuilder } from "@/components/assets/CommandBuilder";
import { Comparison } from "@/components/assets/Comparison";
import { Features } from "@/components/assets/Features";
import { GeneratedFiles } from "@/components/assets/GeneratedFiles";
import { Hero } from "@/components/assets/Hero";
import { Navbar } from "@/components/Navbar";

export function App() {
  return (
    <div className="flex flex-col min-h-screen bg-fd-background text-fd-foreground">
      <Navbar />
      <Hero />
      <CommandBuilder />
      <Features />
      <GeneratedFiles />
      <Comparison />
      <footer className="border-t border-fd-border py-6 text-center text-xs text-fd-muted-foreground">
        <p>
          Part of the{" "}
          <a
            href="https://swoff.space"
            className="hover:text-fd-foreground transition-colors underline underline-offset-2"
          >
            Swoff
          </a>{" "}
          project — offline infrastructure for any stack.
        </p>
      </footer>
    </div>
  );
}
