import React, { useEffect, useState, useRef } from "react";
import { api } from "../api/api";
import TimerBox from "./TimerBox";
import SupervisorModal from "./SupervisorModal";
import { getCycleInfo } from "../utils/timeUtils";

import en from "../locales/en.json";
import fr from "../locales/fr.json";
import ar from "../locales/ar.json";

import alertSound from "../assets/beep.mp3";

export default function MachinePage({ operator, machine, onLogout }) {
  /* ===================== AUDIO ===================== */
  const [alertAudio, setAlertAudio] = useState(null);
  const lastPlayedCycleRef = useRef(null);

  if (!operator || !machine) {
    return <div className="center-screen"><p className="error">Invalid Session. Please log in again.</p></div>;
  }

  useEffect(() => {
    const audio = new Audio(alertSound);
    audio.loop = true;
    audio.preload = "auto";
    setAlertAudio(audio);

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);


  /* ===================== LOGS & SHIFT ===================== */
  const [logsRefreshing, setLogsRefreshing] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [pendingLogId, setPendingLogId] = useState(null);

  const [operatorPressed, setOperatorPressed] = useState(false);
  const [supervisorPressed, setSupervisorPressed] = useState(false);

  const [timeNow, setTimeNow] = useState(new Date());

  /* ===================== LANGUAGE ===================== */
  const [lang, setLang] = useState(localStorage.getItem("lang") || "AR");
  const dictMap = { EN: en, FR: fr, AR: ar };
  const t = dictMap[lang] || dictMap.AR;

  const handleLangClick = () => {
    const langs = ["EN", "FR", "AR"];
    const currentIndex = langs.indexOf(lang);
    const nextIndex = (currentIndex + 1) % langs.length;
    const newLang = langs[nextIndex];
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  };

  /* ===================== TIMER ===================== */
  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ===================== CYCLE INFO ===================== */
  const { cycleStart, cycleEnd, color, shift } = getCycleInfo(timeNow);
  const cycleId = cycleStart.getTime();

  /* ===================== AUTO SYNC ===================== */
  const fetchLatestStatus = async () => {
    try {
      // 1. Check session validity
      const session_id = localStorage.getItem("session_id");
      if (session_id) {
        const valRes = await api.get(`/operators/validate/${session_id}`);
        if (valRes.data && valRes.data.valid === false) {
          console.warn("Session invalidated by server. Logging out.");
          onLogout();
          return;
        }
      }

      // 2. Sync needle log status
      const res = await api.get(`/logs/${machine.machine_id}`);
      const latestLog = res.data;

      if (latestLog) {
        // Only sync if it's the current cycle
        const logCycleStart = new Date(latestLog.cycle_start_time).getTime();
        if (logCycleStart === cycleId) {
          setOperatorPressed(true);
          setPendingLogId(latestLog.supervisor_id ? null : latestLog.log_id);
          setSupervisorPressed(!!latestLog.supervisor_id);
        } else {
          // It's an old log from a previous cycle, ensure UI is clean
          setOperatorPressed(false);
          setSupervisorPressed(false);
          setPendingLogId(null);
        }
      } else {
        // No log exists for this machine, reset states
        setOperatorPressed(false);
        setSupervisorPressed(false);
        setPendingLogId(null);
      }
    } catch (err) {
      console.error("Failed to sync status:", err);
    }
  };

  useEffect(() => {
    // Initial sync
    fetchLatestStatus();

    // Poll every 5 seconds for real-time updates (useful for barcodes and multi-PC sync)
    const interval = setInterval(fetchLatestStatus, 5000);
    return () => clearInterval(interval);
  }, [machine?.machine_id, cycleId]);

  // Manage alert sound based on cycle and operator state
  useEffect(() => {
    if (!alertAudio) return;

    // Only play if this is a new cycle AND the operator hasn't pressed the button yet
    if (lastPlayedCycleRef.current !== cycleId && !operatorPressed) {
      lastPlayedCycleRef.current = cycleId;
      alertAudio.currentTime = 0;
      alertAudio.play().catch(() => {
        console.warn("Auto-play blocked. Waiting for interaction or interaction already happened.");
      });
    }

    // Stop the alert if the operator has pressed the button
    if (operatorPressed && !alertAudio.paused) {
      alertAudio.pause();
      alertAudio.currentTime = 0;
    }
  }, [cycleId, operatorPressed, alertAudio]);

  /* ===================== STATUS ===================== */
  const getStatusForPress = (now, cycleStart) =>
    now - cycleStart <= 10 * 60 * 1000 ? "OK" : "DELAY";

  /* ===================== OPERATOR PRESS ===================== */
  const handleOperatorPress = async () => {
    try {
      if (alertAudio) {
        alertAudio.pause();
        alertAudio.currentTime = 0;
      }

      const now = new Date();
      const status = getStatusForPress(now, cycleStart);

      const payload = {
        machine_id: machine.machine_id,
        operator_id: operator.operator_id,
        color,
        status,
        shift, // use locally computed shift
        cycle_start_time: cycleStart,
        cycle_end_time: cycleEnd,
      };

      const res = await api.post("/logs", payload);

      setOperatorPressed(true);
      setPendingLogId(res.data.log_id || null);
      // optional: refresh logs
    } catch (err) {
      console.error(err);
    }
  };

  /* ===================== SUPERVISOR ===================== */
  const handleOpenSupervisor = () => setShowSupervisorModal(true);

  const handleSupervisorClosed = (confirmed) => {
    setShowSupervisorModal(false);

    if (confirmed) {
      setPendingLogId(null);
      setSupervisorPressed(true);
    }
  };

  /* ===================== LOGOUT ===================== */
  const handleLogout = async () => {
    try {
      // send session_id to backend to end the session
      const session_id = localStorage.getItem("session_id");
      if (session_id) {
        await api.post("/operators/logout", { session_id });
      }
      localStorage.removeItem("session_id");
      onLogout();
    } catch (err) {
      console.error("logout error:", err);
      onLogout(); // logout on UI even if backend fails
    }
  };

  /* ===================== RENDER ===================== */
  return (
    <div className="dashboard">
      {/* BRAND */}
      <div className="logo-flag">
        <div className="logo"></div>
        <div className="flag"></div>
      </div>

      {/* TOP BAR */}
      <header className="top-bar blue-glass">
        <div className="top-bar-container">
          <div className="top-item">
            <span className="label">{t.operator}</span>
            <strong>{operator.name}</strong>
          </div>

          <div className="top-item">
            <span className="label">{t.machine}</span>
            <strong>{machine.code}</strong>
          </div>

          <div className="top-item">
            <span className="label">{t.shift}</span>
            <strong>{shift}</strong>
          </div>
        </div>

        <div className="top-btn">
          <div className="select-lang" onClick={handleLangClick}>
            <span className="lang">{lang}</span>
          </div>
          <button className="btn logout" onClick={handleLogout}>
            {t.logout}
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="main-panel">
        {/* STATUS CARD */}
        <section className="status-card blue-glass">
          <div className="status-left">
            <div className="color_label">
              <h3>{t.current_color}</h3>
              <div className={`color-${color.toLowerCase()}`}></div>
            </div>
            <div className={`needle-color-${color.toLowerCase()} circular-needle`}></div>
          </div>

          <div className="status-right">
            <TimerBox cycleStart={cycleStart} cycleEnd={cycleEnd} timeNow={timeNow} />
          </div>
        </section>

        {/* ACTIONS */}
        <section className="action-card blue-glass">
          <button
            className={`btn big ${operatorPressed ? "btn-success" : "primary"}`}
            onClick={handleOperatorPress}
            disabled={operatorPressed}
          >
            {operatorPressed ? t.needle_changed : t.i_changed_needle}
          </button>

          <button
            className={`btn big ${supervisorPressed ? "btn-success" : operatorPressed ? "btn-attention" : "outline"}`}
            onClick={handleOpenSupervisor}
            disabled={!operatorPressed || supervisorPressed}
          >
            {supervisorPressed ? t.supervisor_verified : t.supervisor_confirm}
          </button>

          {logsRefreshing && <p className="muted center">{t.refreshing_logs}</p>}
        </section>
      </main>

      {showSupervisorModal && (
        <SupervisorModal
          logId={pendingLogId}
          machineId={machine.machine_id}
          onClose={handleSupervisorClosed}
        />
      )}
    </div>
  );
}
