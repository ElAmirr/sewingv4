import cron from "node-cron";
import { readData, writeData } from "./fileDb.js"; // Adjust path if needed
import path from "path";

/**
 * Initializes the cron jobs for auto-logout.
 */
export const initScheduler = () => {
    console.log("⏳ Initializing Auto-Logout Scheduler...");

    // Times: 13:00 (1 PM), 21:00 (9 PM), 05:00 (5 AM) GMT
    // Cron pattern: "minute hour * * *"
    // Note: detailed implementation depends on server timezone. 
    // If server is not in GMT, we might need to adjust or use timezone options.
    // node-cron supports timezone.

    const shifts = [
        { name: "Shift 1 End", cron: "0 13 * * *", time: "13:00 GMT" },
        { name: "Shift 2 End", cron: "0 21 * * *", time: "21:00 GMT" },
        { name: "Shift 3 End", cron: "0 5 * * *", time: "05:00 GMT" }
    ];

    shifts.forEach(shift => {
        cron.schedule(shift.cron, async () => {
            console.log(`⏰ Running Auto-Logout for ${shift.name} (${shift.time})...`);
            await logoutAllSessions();
        }, {
            scheduled: true,
            timezone: "GMT"
        });
    });

    console.log("✅ Scheduler initialized.");
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
