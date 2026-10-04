import "virtual:tokens.css";
import "./global.css";
import { registerSW } from "virtual:pwa-register";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { setPendingUpdate } from "./app-update";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support. A new version waits and is applied when the next game starts.
const updateSW = registerSW({
  onNeedRefresh: () => setPendingUpdate(() => void updateSW(true)),
});
