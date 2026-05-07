import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black selection:bg-white selection:text-black">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          .font-inter { font-family: 'Inter', sans-serif; }
        `}
      </style>
      <div className="font-inter">
        <Navbar />
        <main className="flex-grow">
          <Hero />
          <Features />
        
        {/* Tooling Section */}
        <section className="py-32 border-t border-white/5 bg-black">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-16">Built on modern browser standards</h2>
            <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10" />
                <span className="font-bold text-white tracking-tight">Service Worker</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10" />
                <span className="font-bold text-white tracking-tight">IndexedDB</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10" />
                <span className="font-bold text-white tracking-tight">Cache API</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10" />
                <span className="font-bold text-white tracking-tight">Web Manifest</span>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase Section */}
        <section className="py-32 border-t border-white/5 bg-black">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">Showcase</h2>
              <p className="text-white/40 text-lg">Apps built with the Swoff philosophy.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group relative aspect-[16/10] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                <div className="absolute bottom-10 left-10 z-20">
                  <h4 className="text-2xl font-bold text-white mb-2">Budget Manager</h4>
                  <p className="text-white/50">Full offline budgeting with IndexedDB.</p>
                </div>
              </div>
              <div className="group relative aspect-[16/10] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                <div className="absolute bottom-10 left-10 z-20">
                  <h4 className="text-2xl font-bold text-white mb-2">Note Taking App</h4>
                  <p className="text-white/50">Encrypted, local-first notes.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 border-t border-white/5 bg-black overflow-hidden relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/[0.02] blur-[120px] -z-10 rounded-full" />
          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-5xl md:text-8xl font-black text-white mb-10 tracking-tight">
              Ready to ship?
            </h2>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="/docs"
                className="bg-white text-black hover:bg-white/90 px-12 py-5 rounded-xl font-bold text-lg transition-all shadow-2xl shadow-white/10"
              >
                Get Started for Free
              </a>
              <a
                href="#"
                className="bg-black border border-white/10 text-white hover:bg-white/5 px-12 py-5 rounded-xl font-bold text-lg transition-all"
              >
                Talk to Sales
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Detailed Footer */}
      <footer className="py-24 border-t border-white/5 bg-black">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src="/swoff.png" alt="Swoff" className="h-5 w-auto brightness-200" />
                <span className="font-bold text-white tracking-tight">SWOFF</span>
              </div>
              <p className="text-white/40 text-sm max-w-xs leading-relaxed">
                The open source blueprint for professional offline-first web applications. 
                Built by engineers, for engineers.
              </p>
            </div>
            <div>
              <h5 className="text-white font-bold text-sm mb-6 uppercase tracking-wider">Product</h5>
              <ul className="space-y-4 text-sm text-white/40 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Showcase</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Showcase</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-bold text-sm mb-6 uppercase tracking-wider">Resources</h5>
              <ul className="space-y-4 text-sm text-white/40 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Guides</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-bold text-sm mb-6 uppercase tracking-wider">Company</h5>
              <ul className="space-y-4 text-sm text-white/40 font-medium">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-white/5">
            <p className="text-white/30 text-[13px]">
              © {new Date().getFullYear()} Swoff, Inc. All rights reserved.
            </p>
            <div className="flex gap-8 text-[13px] text-white/30">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}


