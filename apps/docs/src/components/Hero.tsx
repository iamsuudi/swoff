import { Link } from "@tanstack/react-router";
import { buttonVariants } from "fumadocs-ui/components/ui/button";

export function Hero() {
  return (
    <div className="relative pt-32 pb-20 md:pt-48 md:pb-40 overflow-hidden bg-black">
      {/* Background blueprint grid pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.3]" 
        style={{ 
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
            radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px, 60px 60px, 30px 30px',
          backgroundPosition: 'center center'
        }} 
      />
      
      {/* Subtle dashed line elements */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent border-t border-dashed border-white/40" />
        <div className="absolute top-3/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent border-t border-dashed border-white/40" />
        <div className="absolute left-1/4 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-white/30 to-transparent border-l border-dashed border-white/40" />
        <div className="absolute left-3/4 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-white/30 to-transparent border-l border-dashed border-white/40" />
        
        {/* Plus markers at 'key' points */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 text-white/50 font-bold text-xl">+</div>
        <div className="absolute top-1/4 left-3/4 -translate-x-1/2 -translate-y-1/2 text-white/50 font-bold text-xl">+</div>
        <div className="absolute top-3/4 left-1/4 -translate-x-1/2 -translate-y-1/2 text-white/50 font-bold text-xl">+</div>
        <div className="absolute top-3/4 left-3/4 -translate-x-1/2 -translate-y-1/2 text-white/50 font-bold text-xl">+</div>
      </div>

      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-full z-0 opacity-30">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-white/[0.05] rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        {/* Animated Logo Integrated in Hero */}
        <div className="flex justify-center mb-16">
          <div className="relative w-24 h-24 md:w-32 md:h-32 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <svg
              viewBox="0 0 1250 1250"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              <style>
                {`
                  .hero-logo-path {
                    stroke-dasharray: 4000;
                    stroke-dashoffset: 4000;
                    animation: draw-hero 3s cubic-bezier(0.4, 0, 0.2, 1) forwards infinite alternate;
                    stroke-width: 3;
                  }
                  @keyframes draw-hero {
                    0% { stroke-dashoffset: 4000; fill: rgba(255, 255, 255, 0); }
                    50% { stroke-dashoffset: 0; fill: rgba(255, 255, 255, 0); }
                    70%, 100% { stroke-dashoffset: 0; fill: rgba(255, 255, 255, 1); }
                  }
                `}
              </style>
              <path
                className="hero-logo-path"
                d="M312.693 1080.5H190.713L373.425 741.84C399.197 698.316 404.317 676.07 373.425 645.595L294.679 557.584C267.504 510.265 252.331 483.721 275.636 425.826L418.202 169H530.918L383.204 437.149C368.454 462.265 367.674 476.37 383.204 501.484L445.481 568.907C510.268 643.737 514.416 675.678 500.037 725.885L312.693 1080.5Z"
                stroke="white"
              />
              <path
                className="hero-logo-path"
                d="M159.833 934.845H43L219.536 616.772L286.959 697.063L159.833 934.845Z"
                stroke="white"
              />
              <path
                className="hero-logo-path"
                d="M795.464 934.845L728.04 830.365L808.331 700.151L743.995 605.449L667.308 741.84C572.642 580.131 527.239 511.757 474.817 472.662L636.427 169H753.774L602.973 459.795L659.073 547.805L864.431 169H980.234L808.331 493.249L864.431 586.406L1093.98 169H1206.18L795.464 934.845Z"
                stroke="white"
              />
            </svg>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl md:text-[90px] font-black tracking-[-0.04em] text-white leading-[0.85] max-w-5xl mx-auto flex flex-col items-center">
          <span className="block">The Blueprint for</span>
          <span className="bg-white text-black px-4 py-1 mt-3 block whitespace-nowrap">Offline-First Apps</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-[20px] text-white/50 max-w-2xl mx-auto mt-12 mb-12 leading-relaxed font-medium">
          A production-ready framework for building web apps that work offline 
          like native ones. Versioned updates, zero dependencies.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/docs/$"
            params={{ _splat: "" }}
            className={buttonVariants({
              size: "lg",
              className: "bg-white text-black hover:bg-white/90 font-bold px-10 h-14 text-[15px] rounded-lg",
            })}
          >
            Start Building
          </Link>
          <a
            href="https://github.com/iamsuudi/swoff"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "border-white/10 text-white hover:bg-white/5 font-bold px-10 h-14 text-[15px] rounded-lg bg-black",
            })}
          >
            Read Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
