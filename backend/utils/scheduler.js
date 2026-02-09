import { readData, writeData } from "./fileDb.js";
import path from "path";

/**
 * Initializes the cron jobs for auto-logout without external dependencies.
 * Checks the time every minute.
 */
export const initScheduler = () => {
    console.log("⏳ Initializing Zero-Dependency Auto-Logout Scheduler...");

    // Check every minute (60,000 ms)
    setInterval(() => {
        const now = new Date();

        // Use Intl to get GMT hours and minutes
        const gmtTimeString = now.toLocaleString("en-GB", {
            timeZone: "GMT",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });

        // Target GMT times: 13:00, 21:00, 05:00
        const triggerTimes = ["13:00", "21:00", "05:00"];

        if (triggerTimes.includes(gmtTimeString)) {
            console.log(`⏰ Triggering scheduled logout at ${gmtTimeString} GMT`);
            logoutAllSessions();
        }
    }, 60000);

    console.log("✅ Native scheduler initialized (Checks every 60s).");
};

/**
 * Logs out all active sessions.
 */
export async function logoutAllSessions() {
    try {
        const sessions = await readData("machine_sessions.json");
        const now = new Date().toISOString();
        let updatedCount = 0;

        sessions.forEach(session => {
            if (!session.ended_at) {
                session.ended_at = now;
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await writeData("machine_sessions.json", sessions);
            console.log(`✅ Auto-logged out ${updatedCount} active sessions.`);
        } else {
            console.log("ℹ️ No active sessions to log out.");
        }

    } catch (err) {
        console.error("❌ Auto-logout error:", err);
    }
}
