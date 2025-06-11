import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Tv } from "./screens/Tv";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Tv />
  </StrictMode>,
);
