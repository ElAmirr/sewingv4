import React, { useState, useEffect } from "react";
import TimerBox from "./TimerBox";
import { getCycleInfo } from "../utils/timeUtils";

/**
 * MiniView component displayed when the app is in floating icon mode.
 */
export default function MiniView() {
    const [timeNow, setTimeNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTimeNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { cycleStart, cycleEnd } = getCycleInfo(timeNow);

    const handleRestore = () => {
        if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send("restore-window");
        } else if (window.require) {
            const { ipcRenderer } = window.require("electron");
            ipcRenderer.send("restore-window");
        }
    };

    return (
        <button
            className="mini-view timer-mode"
            onClick={handleRestore}
            title="Restore App"
            aria-label="Restore Application"
        >
            <TimerBox
                cycleStart={cycleStart.getTime()}
                cycleEnd={cycleEnd.getTime()}
                timeNow={timeNow.getTime()}
            />
        </button>
    );
}
