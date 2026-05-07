import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute('/showcase')({
  component: ShowcasePage,
});

function ShowcasePage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 px-6 container mx-auto">
        <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">Showcase</h1>
        <p className="text-white/40 text-xl max-w-2xl mb-16 font-medium">
          Discover what's possible with Swoff. 
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {[
            { title: "Budget Manager", desc: "A fully offline budget tracker with complex sync logic." },
            { title: "Task Master", desc: "Collaborative task management that never drops a change." },
          ].map((item, i) => (
            <div key={i} className="group relative aspect-video overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.02]">
              <div className="absolute bottom-10 left-10 z-20">
                <h3 className="text-3xl font-bold mb-2">{item.title}</h3>
                <p className="text-white/50">{item.desc}</p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
