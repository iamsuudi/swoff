import { useState, useEffect } from "react";

export default function SWProgressBar() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "installing" | "ready" | "error">("idle");

  useEffect(() => {
    const handleProgress = (e: CustomEvent) => {
      setStatus("installing");
      setProgress(e.detail.percent);
    };
    const handleReady = () => {
      setStatus("ready");
      setTimeout(() => setStatus("idle"), 1000);
    };
    const handleError = () => setStatus("error");

    window.addEventListener("sw-progress", handleProgress as any);
    window.addEventListener("sw-ready", handleReady);
    window.addEventListener("sw-error", handleError);
    return () => {
      window.removeEventListener("sw-progress", handleProgress as any);
      window.removeEventListener("sw-ready", handleReady);
      window.removeEventListener("sw-error", handleError);
    };
  }, []);

  if (status === "idle") return null;

  return (
    <div className="fixed top-0 left-0 z-[60] h-1 w-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-full transition-all ${
          status === "error" ? "bg-red-500" : "bg-teal-500"
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
