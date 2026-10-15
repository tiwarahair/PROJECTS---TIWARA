import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router";
import "./styles/global.css";
import { appRouter } from "./app-router";
import { startAuthListener } from "./stores/auth-listener";
import { startCacheListener } from "./stores/cache-listener";
import { createStore } from "./stores/store";

const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Missing #root element");

// a deploy replaced the page chunks this tab expects: reload to get the new ones
window.addEventListener("vite:preloadError", () => window.location.reload());

const store = createStore();

startAuthListener(store);
startCacheListener(store);

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={appRouter} />
    </Provider>
  </StrictMode>,
);
