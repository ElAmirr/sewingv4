import fs from "fs";
import { exec } from "child_process";
import { util } from "util";
import { getDataDir } from "./config.js";

const execPromise = (command) => {
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr });
        });
    });
};

let isStorageConnected = true;

/**
 * Checks if the storage directory is accessible.
 * If it looks like a network drive (e.g. starts with "P:"), 
 * it attempts to run a "dir" command to force a reconnect if it fails.
 */
export async function checkStorageConnection() {
    const dataDir = getDataDir();

    // Check if path exists
    let exists = fs.existsSync(dataDir);

    if (!exists) {
        console.warn(`⚠️ [Watchdog] Storage path not found: ${dataDir}`);

        // If it starts with a drive letter (e.g. "P:"), try to wake it up
        if (/^[a-zA-Z]:/.test(dataDir)) {
            const drive = dataDir.substring(0, 2);
            console.log(`📡 [Watchdog] Attempting to wake up drive ${drive}...`);

            const { error } = await execPromise(`dir ${drive}`);

            if (error) {
                console.error(`❌ [Watchdog] Failed to wake up ${drive}:`, error.message);
                isStorageConnected = false;
            } else {
                // Re-check existence after the wake-up command
                exists = fs.existsSync(dataDir);
                if (exists) {
                    console.log(`✅ [Watchdog] Drive ${drive} reconnected successfully.`);
                    isStorageConnected = true;
                } else {
                    console.warn(`⚠️ [Watchdog] Drive info returned OK, but path ${dataDir} still not found.`);
                    isStorageConnected = false;
                }
            }
        } else {
            isStorageConnected = false;
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

    // Initial check (async)
    checkStorageConnection();

    // Periodic check every 60 seconds
    setInterval(async () => {
        await checkStorageConnection();
    }, 60000);
};
