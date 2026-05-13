import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false });

export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = chart;
    mermaid.run({ nodes: [el] }).catch(() => {});
  }, [chart]);

  return (
    <div className="mermaid not-prose my-6 flex justify-center" ref={ref} />
  );
}
