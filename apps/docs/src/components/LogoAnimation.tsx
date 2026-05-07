export function LogoAnimation() {
  return (
    <section className="py-40 bg-black relative overflow-hidden flex flex-col items-center justify-center">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />

      <div className="relative w-full max-w-[600px] aspect-square animate-pulse-slow">
        <svg
          viewBox="0 0 1250 1250"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          <style>
            {`
              .logo-path {
                stroke-dasharray: 4000;
                stroke-dashoffset: 4000;
                animation: draw 3s cubic-bezier(0.4, 0, 0.2, 1) forwards infinite alternate;
                stroke-width: 2;
              }
              .logo-path-1 { animation-delay: 0s; }
              .logo-path-2 { animation-delay: 0.2s; }
              .logo-path-3 { animation-delay: 0.4s; }

              @keyframes draw {
                0% {
                  stroke-dashoffset: 4000;
                  fill: rgba(255, 255, 255, 0);
                }
                50% {
                  stroke-dashoffset: 0;
                  fill: rgba(255, 255, 255, 0);
                }
                70%, 100% {
                  stroke-dashoffset: 0;
                  fill: rgba(255, 255, 255, 1);
                }
              }

              .animate-pulse-slow {
                animation: pulse 4s ease-in-out infinite;
              }

              @keyframes pulse {
                0%, 100% { opacity: 0.8; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.02); }
              }
            `}
          </style>
          <path
            className="logo-path logo-path-1"
            d="M312.693 1080.5H190.713L373.425 741.84C399.197 698.316 404.317 676.07 373.425 645.595L294.679 557.584C267.504 510.265 252.331 483.721 275.636 425.826L418.202 169H530.918L383.204 437.149C368.454 462.265 367.674 476.37 383.204 501.484L445.481 568.907C510.268 643.737 514.416 675.678 500.037 725.885L312.693 1080.5Z"
            stroke="white"
          />
          <path
            className="logo-path logo-path-2"
            d="M159.833 934.845H43L219.536 616.772L286.959 697.063L159.833 934.845Z"
            stroke="white"
          />
          <path
            className="logo-path logo-path-3"
            d="M795.464 934.845L728.04 830.365L808.331 700.151L743.995 605.449L667.308 741.84C572.642 580.131 527.239 511.757 474.817 472.662L636.427 169H753.774L602.973 459.795L659.073 547.805L864.431 169H980.234L808.331 493.249L864.431 586.406L1093.98 169H1206.18L795.464 934.845Z"
            stroke="white"
          />
        </svg>
      </div>

      <div className="mt-12 text-center">
        <h3 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-4">
          Engineered for Speed
        </h3>
        <p className="text-white/40 text-lg max-w-lg mx-auto font-medium">
          A logo built from pure vectors, animated with CSS precision. 
          Performance-first architecture in every line.
        </p>
      </div>
    </section>
  );
}
