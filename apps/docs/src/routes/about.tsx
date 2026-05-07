import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 px-6 container mx-auto">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-black mb-12 tracking-tighter">About Swoff</h1>
          <div className="space-y-8 text-white/60 text-lg leading-relaxed font-medium">
            <p>
              Swoff was born out of a simple frustration: why is it so hard to build 
              web apps that work as reliably as native ones?
            </p>
            <p>
              We believe the web is the most powerful platform ever created, but it's 
              too often limited by a "connected-only" mindset. Swoff provides the 
              blueprints to break those limits.
            </p>
            <p>
              Our mission is to empower developers to build software that is 
              resilient, fast, and always available—no matter the connection.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
