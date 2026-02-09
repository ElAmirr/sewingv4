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
        <div className="mini-view" onClick={handleRestore}>
            <div className="mini-circle pulse">
                <img src={sewingIcon} alt="Sewing Icon" className="mini-logo-img" />
            </div>
        </div>
    );
}
