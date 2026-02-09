import React, { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import MachinePage from "./components/MachinePage";
import MiniView from "./components/MiniView";


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
    // Check if we are in mini mode via URL param
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "mini") {
      setWindowState("mini");
      document.documentElement.classList.add("mini-mode");
    } else {
      document.documentElement.classList.remove("mini-mode");
    }
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
