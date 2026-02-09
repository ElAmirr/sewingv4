import React from "react";

export default function WindowControls() {
    const sendAction = (action) => {
        if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send(action);
        } else if (window.require) {
            const { ipcRenderer } = window.require("electron");
            ipcRenderer.send(action);
        }
    };

    return (
        <div className="window-controls">
            <button className="control-btn minimize" onClick={() => sendAction("minimize-window")}>
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M19 13H5v-2h14v2z" />
                </svg>
            </button>
            <button className="control-btn close" onClick={() => sendAction("close-window")}>
                <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
            </button>
        </div>
    );
}
