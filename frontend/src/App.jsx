import React, { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import MachinePage from "./components/MachinePage";


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

  const handleLogin = (data) => {
    setSession(data);
    localStorage.setItem("session", JSON.stringify(data));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("session");
  };

  return (
    <div className="app-root">
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
    </div>
  );
}
