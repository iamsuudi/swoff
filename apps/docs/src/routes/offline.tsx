import { createFileRoute } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";

export const Route = createFileRoute("/offline")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-screen flex flex-col justify-center items-center gap-3">
      <WifiOff className="size-20 animate-pulse" />
      <p className="text-fd-muted-foreground">
        You are offline. Some features may not work.
      </p>
    </div>
  );
}
