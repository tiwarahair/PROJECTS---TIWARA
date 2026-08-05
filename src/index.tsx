import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router";
import { App } from "./app";
import { BackdropProvider } from "./hooks/use-backdrop-location";
import { store } from "./stores/store";
import "./styles/index.css";

const container = document.getElementById("root") as HTMLElement;

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <BackdropProvider>
          <App />
        </BackdropProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
