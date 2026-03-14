import fs from "fs";
import { exec } from "child_process";
import { getDataDir } from "./config.js";

let isStorageConnected = true;

/**
 * Checks if the storage directory is accessible.
 * If it looks like a network drive (e.g. starts with "P:"), 
 * it attempts to run a "dir" command to force a reconnect if it fails.
 */
export async function checkStorageConnection() {
    const dataDir = getDataDir();
    const exists = fs.existsSync(dataDir);

    if (!exists) {
        console.warn(`⚠️ [Watchdog] Storage path not found: ${dataDir}`);
        isStorageConnected = false;

        // If it starts with a drive letter (e.g. "P:"), try to wake it up
        if (/^[a-zA-Z]:/.test(dataDir)) {
            const drive = dataDir.substring(0, 2);
            console.log(`📡 [Watchdog] Attempting to reconnect drive ${drive}...`);

            exec(`dir ${drive}`, (error) => {
                if (error) {
                    console.error(`❌ [Watchdog] Failed to reconnect ${drive}:`, error.message);
                } else {
                    console.log(`✅ [Watchdog] Drive ${drive} reconnected successfully.`);
                    isStorageConnected = true;
                }
            });
        }
    } else {
        if (!isStorageConnected) {
            console.log("✅ [Watchdog] Storage connection restored.");
        }
        isStorageConnected = true;
    }

    return isStorageConnected;
}

export function getStorageStatus() {
    return isStorageConnected;
}

export const initStorageWatchdog = () => {
    const dataDir = getDataDir();
    console.log(`📡 Initializing Storage Watchdog...`);
    console.log(`📂 Monitoring Path: ${dataDir}`);

    // Initial check
    checkStorageConnection();

    // Periodic check every 60 seconds
    setInterval(() => {
        checkStorageConnection();
    }, 60000);
};
