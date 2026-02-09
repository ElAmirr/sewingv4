import React, { useEffect, useState } from "react";
import { api } from "../api/api";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import ar from "../locales/ar.json";

export default function LoginPage({ onLogin }) {
  const [badge, setBadge] = useState("");
  const [machines, setMachines] = useState([]);
  const [machineId, setMachineId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(true);

  // Load language from localStorage or default EN
  const [lang, setLang] = useState(localStorage.getItem("lang") || "EN");
  useEffect(() => localStorage.setItem("lang", lang), [lang]);
  const dictMap = { EN: en, FR: fr, AR: ar };
  const t = dictMap[lang] || dictMap.EN;

  // Load machines from API with better error handling + retry
  const fetchMachines = async () => {
    setLoadingMachines(true);
    setError("");
    try {
      const res = await api.get("/machines");
      const list = Array.isArray(res.data) ? res.data : res.data?.machines ?? [];
      setMachines(list);
      if (list.length > 0) setMachineId(list[0].machine_id);
    } catch (err) {
      console.error("Failed to load machines:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load machines";
      setError(msg);
    } finally {
      setLoadingMachines(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []); // ✅ Already correct

  // Cycle language: EN -> FR -> AR
  const handleLangClick = () => {
    const langs = ["EN", "FR", "AR"];
    const currentIndex = langs.indexOf(lang);
    const nextIndex = (currentIndex + 1) % langs.length;
    setLang(langs[nextIndex]);
  };

  const handleLogin = async () => {
    setError("");
    if (!badge.trim()) return setError(t.scanBadge || "Scan your badge");
    if (!machineId) return setError(t.selectMachine || "Select a machine");
    setLoading(true);
    try {
      const res = await api.post("/operators/login", {
        badge_code: badge.trim(),
        machine_id: Number(machineId),
      });

      const operator = res.data?.operator ?? null;
      const sessionId = res.data?.session_id ?? null;
      if (sessionId) localStorage.setItem("session_id", sessionId);

      if (!operator) {
        setError("Unexpected server response");
      } else {
        onLogin({
          operator,
          machine: machines.find((m) => m.machine_id === Number(machineId)) || null,
        });
      }
    } catch (err) {
      console.error("login failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="center-screen">
      <div className="action-card blue-glass login-card">
        <div className="select-lang" onClick={handleLangClick}>
          <span className="lang">{lang}</span>
        </div>

        <h1>{t.title}</h1>

        {/* Machines loading / error UI */}
        {loadingMachines ? (
          <p className="muted">Loading machines...</p>
        ) : error && machines.length === 0 ? (
          <>
            <p className="error">Failed to load machines: {error}</p>
            <div className="btn-row">
              <button className="btn" onClick={fetchMachines}>
                Retry
              </button>
            </div>
          </>
        ) : null}

        <input
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t.scanBadge}
          className="input"
          autoFocus
        />

        <select
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          className="input"
          disabled={loadingMachines || machines.length === 0}
        >
          <option value="">{t.select}</option>
          {machines.map((machine) => (
            <option key={machine.machine_id} value={machine.machine_id}>
              {machine.code}
            </option>
          ))}
        </select>

        <div className="btn-row">
          <button
            className="login btn"
            onClick={handleLogin}
            disabled={loading || loadingMachines || machines.length === 0}
          >
            {loading ? "Logging in..." : t.login}
          </button>
        </div>

        {error && machines.length > 0 && <p className="error">{error}</p>}

        <p className="muted">{t.muted}</p>
      </div>
    </div>
  );
}

// Add before INSERT in loginOperator:
// await conn.execute(
// "DELETE FROM machine_sessions WHERE machine_id = ? AND ended_at IS NOT NULL",
// [machine_id]
// );
