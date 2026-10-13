import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router";
import "./styles/global.css";
import { appRouter } from "./app-router";
import { startAuthListener } from "./stores/auth-listener";
import { createStore } from "./stores/store";

const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Missing #root element");

const store = createStore();

startAuthListener(store);

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={appRouter} />
    </Provider>
  </StrictMode>,
);
