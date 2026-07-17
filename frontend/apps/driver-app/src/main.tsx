import React from "react";
import { createRoot } from "react-dom/client";

import "@good-rapido/ui/styles.css";
import "./styles/app.css";
import { App } from "./app/App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Good Rapido driver app root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
