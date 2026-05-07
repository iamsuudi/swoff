import { Code2, Globe, RefreshCw, Database, Smartphone, ShieldCheck, Zap, Layers, Cpu } from "lucide-react";

export function Features() {
  return (
    <section className="py-32 bg-black border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="mb-20 text-center md:text-left">
          <h2 className="text-2xl font-bold text-white mb-4">What's in Swoff?</h2>
          <p className="text-white/40 max-w-2xl text-[17px] leading-relaxed">
            Swoff provides everything you need to build robust offline applications 
            using modern browser standards and zero external dependencies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Main Card */}
          <div className="md:col-span-8 group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02] p-10 hover:border-white/20 transition-all">
            <div className="relative z-10">
              <Zap className="w-8 h-8 text-white mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Versioned Updates</h3>
              <p className="text-white/50 text-[16px] leading-relaxed max-w-md">
                User-consented service worker updates. Never break your users' experience 
                with silent, automatic updates again. Complete control over deployment.
              </p>
            </div>
            {/* Visual Decoration */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/[0.03] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          </div>

          {/* Small Card 1 */}
          <div className="md:col-span-4 group rounded-[24px] border border-white/10 bg-white/[0.02] p-10 hover:border-white/20 transition-all">
            <Smartphone className="w-8 h-8 text-white mb-6" />
            <h3 className="text-xl font-bold text-white mb-3">Native-Feel</h3>
            <p className="text-white/50 text-[15px] leading-relaxed">
              Full PWA support with instant loading and offline availability.
            </p>
          </div>

          {/* Small Card 2 */}
          <div className="md:col-span-4 group rounded-[24px] border border-white/10 bg-white/[0.02] p-10 hover:border-white/20 transition-all">
            <Code2 className="w-8 h-8 text-white mb-6" />
            <h3 className="text-xl font-bold text-white mb-3">Zero Deps</h3>
            <p className="text-white/50 text-[15px] leading-relaxed">
              No npm packages to manage. Just pure, portable patterns.
            </p>
          </div>

          {/* Medium Card */}
          <div className="md:col-span-8 group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02] p-10 hover:border-white/20 transition-all">
            <div className="relative z-10 flex flex-col md:flex-row gap-10">
              <div className="flex-1">
                <Database className="w-8 h-8 text-white mb-6" />
                <h3 className="text-2xl font-bold text-white mb-4">IndexedDB Patterns</h3>
                <p className="text-white/50 text-[16px] leading-relaxed">
                  Robust data persistence layer built on top of IndexedDB. 
                  Optimized for performance and reliability in offline environments.
                </p>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-video rounded-lg bg-white/5 animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {/* More cards */}
          <div className="md:col-span-4 group rounded-[24px] border border-white/10 bg-white/[0.02] p-10 hover:border-white/20 transition-all">
            <ShieldCheck className="w-8 h-8 text-white mb-6" />
            <h3 className="text-xl font-bold text-white mb-3">Secure</h3>
            <p className="text-white/50 text-[15px] leading-relaxed">
              Content security policy and secure caching strategies out of the box.
            </p>
          </div>
          <div className="md:col-span-4 group rounded-[24px] border border-white/10 bg-white/[0.02] p-10 hover:border-white/20 transition-all">
            <Layers className="size-8 text-white mb-6" />
            <h3 className="text-xl font-bold text-white mb-3">Architecture</h3>
            <p className="text-white/50 text-[15px] leading-relaxed">
              Separation of concerns between service workers, UI, and data.
            </p>
          </div>
          <div className="md:col-span-4 group rounded-[24px] border border-white/10 bg-white/[0.02] p-10 hover:border-white/20 transition-all">
            <Cpu className="size-8 text-white mb-6" />
            <h3 className="text-xl font-bold text-white mb-3">Performant</h3>
            <p className="text-white/50 text-[15px] leading-relaxed">
              Optimized for minimal main thread impact and battery life.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
