import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles.css";

if (window.location.pathname === "/apps") {
  window.history.replaceState(null, "", "/");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);