import React from "react";

/**
 * MiniView component serves as a transparent overlay in floating mode.
 * It handles window restoration on click and dragging for Electron.
 */
export default function MiniView() {
    const handleRestore = () => {
        try {
            if (window.electron && window.electron.ipcRenderer) {
                window.electron.ipcRenderer.send("restore-window");
            } else if (typeof window.require === 'function') {
                const electron = window.require("electron");
                if (electron && electron.ipcRenderer) {
                    electron.ipcRenderer.send("restore-window");
                }
            }
        } catch (err) {
            console.warn("Electron restore-window failed (likely running in browser):", err);
        }
    };

    return (
        <div className="mini-view-container drag-region">
            <button
                className="mini-view-overlay no-drag"
                onClick={handleRestore}
                title="Restore App"
                aria-label="Restore Application"
            />
        </div>
    );
}
