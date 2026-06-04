import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { initServiceWorker } from "../swoff/client-injector";
import { checkStorage } from "../swoff/notification";

// ── Swoff Notifications ─────────────────────────────────
// Replace with your own toast library
window.addEventListener("swoff:notification", (event) => {
  const { level, code, message } = event.detail;
  console.log(`[swoff:${level}] ${code}: ${message}`);
});

initServiceWorker().then(() => {
  // Check storage quota after SW is registered
  checkStorage();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
