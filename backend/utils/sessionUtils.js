import fs from "fs";
import path from "path";
import { getDataDir } from "./config.js";
import { readData, writeData } from "./fileDb.js";
import { getProductionDate } from "./timeHelper.js";

/**
 * Intelligent Session ID format: S_M{machineId}_{YYYYMMDD}_{timestamp}
 * Example: S_M3_20260313_1710321234
 */

export function generateSessionId(machineId) {
    const now = new Date();
    const prodDateStr = getProductionDate(now).replace(/-/g, "");
    const timestamp = now.getTime();
    return `S_M${machineId}_${prodDateStr}_${timestamp}`;
}

export function parseSessionId(sessionId) {
    if (!sessionId || !sessionId.startsWith("S_M")) return null;

    const parts = sessionId.split("_");
    if (parts.length < 4) return null;

    const machineId = Number(parts[1].substring(1));
    const dateStr = parts[2]; // YYYYMMDD
    const dateISO = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;

    return {
        machineId,
        dateISO,
        timestamp: parts[3]
    };
}

export function getSessionFilePath(machineId, dateISO) {
    const date = dateISO || getProductionDate();
    return `machine_${machineId}/sessions/${date}.json`;
}

/**
 * Finds a session across all files for a machine if date is unknown (rarely used due to intelligent IDs)
 */
export async function findSessionGlobally(machineId, sessionId) {
    const dataDir = getDataDir();
    const sessionsDir = path.join(dataDir, `machine_${machineId}`, "sessions");

    if (!fs.existsSync(sessionsDir)) return null;

    const files = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith(".json"))
        .sort((a, b) => b.localeCompare(a)); // Newest first

    for (const file of files) {
        const relPath = `machine_${machineId}/sessions/${file}`;
        const sessions = await readData(relPath);
        const session = sessions.find(s => s.session_id === sessionId);
        if (session) return { session, relPath, allSessions: sessions };
    }

    return null;
}

/**
 * Aggregates all active sessions from all machines
 */
export async function getActiveSessions() {
    const dataDir = getDataDir();
    const activeSessions = [];

    if (!fs.existsSync(dataDir)) return [];

    const machineDirs = fs.readdirSync(dataDir)
        .filter(d => d.startsWith("machine_") && fs.statSync(path.join(dataDir, d)).isDirectory());

    const todayProdStr = getProductionDate();

    for (const mDir of machineDirs) {
        const machineId = mDir.split("_")[1];
        const sessionsPath = path.join(dataDir, mDir, "sessions", `${todayProdStr}.json`);

        if (fs.existsSync(sessionsPath)) {
            const relPath = `${mDir}/sessions/${todayProdStr}.json`;
            const sessions = await readData(relPath);
            sessions.forEach(s => {
                if (!s.ended_at) activeSessions.push(s);
            });
        }

        // Also check previous production date (for very long sessions or just-switched shifts)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayProdStr = getProductionDate(yesterday);
        if (yesterdayProdStr !== todayProdStr) {
            const yesterdayPath = path.join(dataDir, mDir, "sessions", `${yesterdayProdStr}.json`);
            if (fs.existsSync(yesterdayPath)) {
                const relPath = `${mDir}/sessions/${yesterdayProdStr}.json`;
                const sessions = await readData(relPath);
                sessions.forEach(s => {
                    if (!s.ended_at) activeSessions.push(s);
                });
            }
        }
    }

    return activeSessions;
}
