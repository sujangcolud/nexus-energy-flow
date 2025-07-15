import React from "react";
import { createRoot } from "react-dom/client";
import App from "./AppSimple.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
