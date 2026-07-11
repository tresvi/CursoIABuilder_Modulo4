import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MainPage } from "./pages/MainPage";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <MainPage />
    </StrictMode>
  );
}
