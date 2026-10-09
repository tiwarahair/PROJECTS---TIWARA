import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router";
import "./styles/design-system/styles.css";
import "./styles/global.css";
import { appRouter } from "./app-router";
import { createStore } from "./stores/store";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={createStore()}>
      <RouterProvider router={appRouter} />
    </Provider>
  </StrictMode>,
);
