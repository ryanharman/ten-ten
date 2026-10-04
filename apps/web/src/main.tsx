import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "virtual:tokens.css";
import "./global.css";
import { App } from "./app";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
