import React, { useEffect, useState, useRef } from "react";
import { api } from "../api/api";
import TimerBox from "./TimerBox";
import SupervisorModal from "./SupervisorModal";

import en from "../locales/en.json";
import fr from "../locales/fr.json";
import ar from "../locales/ar.json";

import alertSound from "../assets/beep.mp3";

export default function MachinePage({ operator, machine, onLogout }) {
  /* ===================== AUDIO ===================== */
  const [alertAudio, setAlertAudio] = useState(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const lastPlayedCycleRef = useRef(null);

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

  const unlockAudio = () => {
    if (!alertAudio) return;

    alertAudio.muted = true;

    alertAudio
      .play()
      .then(() => {
        alertAudio.pause();
        alertAudio.currentTime = 0;
        alertAudio.muted = false;
        setAudioUnlocked(true);
      })
      .catch((err) => console.error("Audio unlock failed", err));
  };

  /* ===================== LOGS & SHIFT ===================== */
  const [logsRefreshing, setLogsRefreshing] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [pendingLogId, setPendingLogId] = useState(null);

  const [operatorPressed, setOperatorPressed] = useState(false);
  const [supervisorPressed, setSupervisorPressed] = useState(false);

  const [timeNow, setTimeNow] = useState(new Date());

  /* ===================== LANGUAGE ===================== */
  const languages = [localStorage.getItem("lang") || "EN", "EN", "FR", "AR"];
  const dictMap = { EN: en, FR: fr, AR: ar };
  const [langIndex, setLangIndex] = useState(0);
  const currentLang = languages[langIndex];
  const t = dictMap[currentLang];

  const handleLangClick = () =>
    setLangIndex((prev) => (prev + 1) % languages.length);

  /* ===================== TIMER ===================== */
  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ===================== CYCLE INFO ===================== */
  const cycleHour = timeNow.getHours() - (timeNow.getHours() % 2);
  const cycleStart = new Date(timeNow);
  cycleStart.setHours(cycleHour, 0, 0, 0);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setHours(cycleStart.getHours() + 2);

  const cyclesSinceMidnight = Math.floor(cycleStart.getHours() / 2);
  const colors = ["Blue", "Green", "Yellow", "Red"];
  const color = colors[cyclesSinceMidnight % colors.length];

  // compute local shift (no DB dependency)
  const hour = timeNow.getHours();
  let shift = "Shift3";
  if (hour >= 6 && hour < 14) shift = "Shift1";
  else if (hour >= 14 && hour < 22) shift = "Shift2";

  const cycleId = cycleStart.getTime();

  useEffect(() => {
    // reset UI on new cycle
    setOperatorPressed(false);
    setSupervisorPressed(false);
    setPendingLogId(null);

    if (alertAudio && audioUnlocked && lastPlayedCycleRef.current !== cycleId) {
      lastPlayedCycleRef.current = cycleId;
      alertAudio.currentTime = 0;
      alertAudio.play().catch(() => {});
    }
  }, [cycleId, alertAudio, audioUnlocked]);

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
    setPendingLogId(null);

    if (confirmed) setSupervisorPressed(true);
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
          {!audioUnlocked && (
            <svg
              onClick={unlockAudio}
              title="Enable sound alerts"
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3z" />
              <line
                x1="16"
                y1="9"
                x2="21"
                y2="15"
                stroke="red"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="21"
                y1="9"
                x2="16"
                y2="15"
                stroke="red"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
          <div className="select-lang" onClick={handleLangClick}>
            <span className="lang">{currentLang}</span>
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
            className={`btn big ${
              supervisorPressed ? "btn-success" : operatorPressed ? "btn-attention" : "outline"
            }`}
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
