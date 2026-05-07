import { Link } from "@tanstack/react-router";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src="/swoff.png" 
              alt="Swoff" 
              className="h-5 w-auto brightness-200" 
            />
            <span className="text-sm font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">SWOFF</span>
          </Link>
          <div className="hidden md:flex items-center gap-5">
            <Link
              to="/showcase"
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors"
            >
              Showcase
            </Link>
            <Link
              to="/docs/$"
              params={{ _splat: "" }}
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors"
            >
              Docs
            </Link>
            <Link
              to="/templates"
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors"
            >
              Templates
            </Link>
            <Link
              to="/about"
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors"
            >
              About
            </Link>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/docs/$"
              params={{ _splat: "" }}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "h-8 border-white/10 bg-white/5 text-[13px] font-medium text-white hover:bg-white/10 px-4",
              })}
            >
              Log In
            </Link>
            <Link
              to="/docs/$"
              params={{ _splat: "" }}
              className={buttonVariants({
                size: "sm",
                className: "h-8 bg-white text-black hover:bg-white/90 text-[13px] font-bold px-4",
              })}
            >
              Get Started
            </Link>
          </div>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white/60 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden absolute top-14 left-0 w-full bg-black border-b border-white/10 py-6 px-6 flex flex-col gap-6 animate-in slide-in-from-top duration-300">
          <Link to="/showcase" className="text-lg font-bold text-white" onClick={() => setIsOpen(false)}>Showcase</Link>
          <Link to="/docs" className="text-lg font-bold text-white" onClick={() => setIsOpen(false)}>Docs</Link>
          <Link to="/templates" className="text-lg font-bold text-white" onClick={() => setIsOpen(false)}>Templates</Link>
          <Link to="/about" className="text-lg font-bold text-white" onClick={() => setIsOpen(false)}>About</Link>
          <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
            <Link to="/docs" className={buttonVariants({ className: "w-full bg-white text-black font-bold" })}>Get Started</Link>
            <Link to="/docs" className={buttonVariants({ variant: "outline", className: "w-full border-white/10 text-white" })}>Log In</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
