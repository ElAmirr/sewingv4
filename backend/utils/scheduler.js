import { readData, writeData } from "./fileDb.js";
import { getDataDir } from "./config.js";
import fs from "fs";
import path from "path";
import { getTunisiaISO } from "./timeHelper.js";

/**
 * Initializes the cron jobs for auto-logout without external dependencies.
 * Checks the local Tunisia time every minute.
 */
export const initScheduler = () => {
    console.log("⏳ Initializing Tunisia-Local Auto-Logout Scheduler...");

    // Check every minute (60,000 ms)
    setInterval(() => {
        const now = new Date();

        // Use Tunisia local time for triggers
        const localTimeString = now.toLocaleString("en-GB", {
            timeZone: "Africa/Tunis",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });

        // Local Tunisia transition times (End of shifts)
        const triggerTimes = ["06:00", "14:00", "22:00"];

        if (triggerTimes.includes(localTimeString)) {
            console.log(`⏰ Triggering scheduled logout at ${localTimeString} Tunisia Time`);
            logoutAllSessions();
        }
    }, 60000);

    console.log("✅ Native scheduler initialized (Checks every 60s).");
};

/**
 * Logs out all active sessions across all machines.
 */
export async function logoutAllSessions() {
    try {
        const dataDir = getDataDir();
        const nowISO = getTunisiaISO();
        let totalUpdated = 0;

        if (!fs.existsSync(dataDir)) return;

        const machineDirs = fs.readdirSync(dataDir)
            .filter(d => d.startsWith("machine_") && fs.statSync(path.join(dataDir, d)).isDirectory());

        for (const mDir of machineDirs) {
            const sessionsDir = path.join(dataDir, mDir, "sessions");
            if (!fs.existsSync(sessionsDir)) continue;

            const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith(".json"));

            for (const sFile of sessionFiles) {
                const relPath = `${mDir}/sessions/${sFile}`;
                const sessions = await readData(relPath);
                let fileUpdated = false;

                sessions.forEach(session => {
                    if (!session.ended_at) {
                        session.ended_at = nowISO;
                        fileUpdated = true;
                        totalUpdated++;
                    }
                });

                if (fileUpdated) {
                    await writeData(relPath, sessions);
                }
            }
        }

        if (totalUpdated > 0) {
            console.log(`✅ Auto-logged out ${totalUpdated} active sessions across all machines.`);
        } else {
            console.log("ℹ :No active sessions to log out.");
        }

    } catch (err) {
        console.error("❌ Auto-logout error:", err);
    }
}
