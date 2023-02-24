import React from "react";
import { createRoot } from "react-dom/client";
import Sandbox from "@pages/sandbox/Sandbox";
import refreshOnUpdate from "virtual:reload-on-update-in-view";

refreshOnUpdate("pages/sandbox");

function init() {
  const appContainer = document.querySelector("#app-container");
  if (!appContainer) {
    throw new Error("Can not find AppContainer");
  }
  const root = createRoot(appContainer);
  root.render(<Sandbox />);
}

init();
