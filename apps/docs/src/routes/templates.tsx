import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute('/templates')({
  component: TemplatesPage,
});

function TemplatesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 px-6 container mx-auto">
        <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">Templates</h1>
        <p className="text-white/40 text-xl max-w-2xl mb-16 font-medium">
          Kickstart your offline-first journey with our production-ready templates.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { title: "SaaS Starter", desc: "Full auth, payments, and offline sync." },
            { title: "Note App", desc: "Local-first note taking with E2E encryption." },
            { title: "Dashboard", desc: "Real-time analytics that work offline." },
          ].map((item, i) => (
            <div key={i} className="p-8 rounded-[24px] border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-white/5 mb-6" />
              <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
              <p className="text-white/50 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
