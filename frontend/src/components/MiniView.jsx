import React from "react";
import sewingIcon from "../assets/sewing.png";

/**
 * MiniView component displayed when the app is in floating icon mode.
 */
export default function MiniView() {
    const handleRestore = () => {
        if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send("restore-window");
        } else if (window.require) {
            // Fallback for direct nodeIntegration
            const { ipcRenderer } = window.require("electron");
            ipcRenderer.send("restore-window");
        }
    };

    return (
        <button
            className="mini-view"
            onClick={handleRestore}
            title="Restore App"
            aria-label="Restore Application"
        >
            <div className="mini-circle">
                <img src={sewingIcon} alt="Sewing Icon" className="mini-logo-img" />
            </div>
        </button>
    );
}
