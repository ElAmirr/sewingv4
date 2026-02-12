import React, { useRef } from "react";

/**
 * MiniView component serves as a transparent overlay in floating mode.
 * It handles window restoration on click and dragging for Electron.
 */
export default function MiniView() {
    const isDraggingRef = useRef(false);
    const mouseDownPosRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        isDraggingRef.current = false;
        mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        // If mouse moved more than 5px, consider it a drag
        const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
        const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
        if (deltaX > 5 || deltaY > 5) {
            isDraggingRef.current = true;
        }
    };

    const handleClick = () => {
        // Only restore if it wasn't a drag
        if (!isDraggingRef.current) {
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
        }
        isDraggingRef.current = false;
    };

    return (
        <div
            className="mini-view-container drag-region"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
        >
            <div
                className="mini-view-overlay no-drag"
                title="Click to Restore | Drag to Move"
                aria-label="Restore Application"
            />
        </div>
    );
}
