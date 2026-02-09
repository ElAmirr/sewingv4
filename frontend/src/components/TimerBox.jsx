import React from "react";

export default function TimerBox({ cycleStart, cycleEnd, timeNow }) {
  const remainingMs = Math.max(0, cycleEnd - timeNow);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return (
    <div className="timer-box">
      <div className="muted">
        {new Date(cycleStart).toLocaleTimeString()} →{" "}
        {new Date(cycleEnd).toLocaleTimeString()}
      </div>

      <div className="big-time">
        {hours > 0 && `${hours} : `}
        {String(mins).padStart(2, "0")} : {String(secs).padStart(2, "0")}
      </div>
    </div>
  );
}
