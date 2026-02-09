import React, { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import MachinePage from "./components/MachinePage";
import MiniView from "./components/MiniView";
import WindowControls from "./components/WindowControls";


export default function App() {
  const [session, setSession] = useState(
    JSON.parse(localStorage.getItem("session")) || null
  );

  // Load saved language from localStorage or default to EN
  const [lang, setLang] = useState(localStorage.getItem("lang") || "EN");

  // Save language to localStorage when changed
  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const [windowState, setWindowState] = useState("full");

  useEffect(() => {
    const handleState = (event, state) => setWindowState(state);

    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.on("window-state", handleState);
    } else if (window.require) {
      const { ipcRenderer } = window.require("electron");
      ipcRenderer.on("window-state", handleState);
    }

    return () => {
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.removeListener("window-state", handleState);
      }
    };
  }, []);

  const handleLogin = (data) => {
    setSession(data);
    localStorage.setItem("session", JSON.stringify(data));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("session");
  };

  return (
    <div className={`app-root ${windowState}`}>
      {windowState === "mini" ? (
        <MiniView />
      ) : (
        <>
          <WindowControls />
          {!session ? (
            <LoginPage
              onLogin={handleLogin}
              lang={lang}
              onLangChange={setLang}
            />
          ) : (
            <MachinePage
              lang={lang}
              onLangChange={setLang}
              operator={session.operator}
              machine={session.machine}
              onLogout={handleLogout}
            />
          )}
        </>
      )}
    </div>
  );
}
