import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import { LanguageProvider } from "./i18n.js";
import "./styles.css";

// Keep one local entrance so the login cookie always lands on the same
// origin: 127.0.0.1 visits hop to localhost before the app mounts. Lives in
// the bundle (not inline in index.html) because the server CSP only allows
// same-origin scripts.
if (window.location.hostname === "127.0.0.1") {
  window.location.replace(
    `http://localhost:${window.location.port}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Vaenyx could not find its root element.");
}

createRoot(root).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
