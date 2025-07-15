import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("main.tsx executing", new Date().toISOString());

const rootElement = document.getElementById("root");
console.log("Root element found:", !!rootElement);

if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Root element not found!");
}
