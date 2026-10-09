import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "./styles/design-system/styles.css";
import "./styles/global.css";
import { appRouter } from "./app-router";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={appRouter} />
  </StrictMode>,
);
