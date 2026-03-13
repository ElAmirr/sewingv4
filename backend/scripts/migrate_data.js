import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');

/**
 * Returns Tunisia local ISO string (+01:00) from a Date object or ISO string.
 */
function toTunisiaISO(dateInput) {
    if (!dateInput) return null;
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateInput;

    // Add 1 hour to UTC if it's Zulu, or just treat as UTC
    // date.toLocaleString handles timezone conversion
    const options = {
        timeZone: 'Africa/Tunis',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const formatter = new Intl.DateTimeFormat('sv-SE', options);
    const parts = formatter.formatToParts(date);
    const p = {};
    parts.forEach(part => { p[part.type] = part.value; });

    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+01:00`;
}

/**
 * Returns Production Date (YYYY-MM-DD) for a given date.
 * Night shift (22:00 - 06:00) belongs to the NEXT day if started between 22-00.
 */
function getProductionDate(dateInput) {
    const date = new Date(dateInput);
    const options = { timeZone: 'Africa/Tunis', hour: 'numeric', hour12: false };
    const hour = Number(new Intl.DateTimeFormat('en-US', options).format(date));

    const d = new Date(date);
    if (hour >= 22) {
        d.setDate(d.getDate() + 1);
    }

    const dOptions = { timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit' };
    const parts = new Intl.DateTimeFormat('sv-SE', dOptions).formatToParts(d);
    const p = {};
    parts.forEach(part => { p[part.type] = part.value; });
    return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Returns Shift Name based on hour.
 */
function getShiftName(dateInput) {
    const date = new Date(dateInput);
    const options = { timeZone: 'Africa/Tunis', hour: 'numeric', hour12: false };
    const hour = Number(new Intl.DateTimeFormat('en-US', options).format(date));

    if (hour >= 6 && hour < 14) return 'Shift2';
    if (hour >= 14 && hour < 22) return 'Shift3';
    return 'Shift1'; // 22:00 - 06:00
}

async function migrate() {
    console.log("🚀 Starting Data Migration...");

    // 1. Migrate machine_sessions.json
    const sessionsFile = path.join(DATA_DIR, 'machine_sessions.json');
    if (fs.existsSync(sessionsFile)) {
        console.log(`📦 Found ${sessionsFile}. Starting session migration...`);
        const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
        console.log(`📊 Processing ${sessions.length} sessions...`);

        for (const session of sessions) {
            const machineId = session.machine_id;
            const startedAt = session.started_at;

            const prodDate = getProductionDate(startedAt);
            const tunisiaStart = toTunisiaISO(startedAt);
            const tunisiaEnd = toTunisiaISO(session.ended_at);
            const tunisiaHB = toTunisiaISO(session.last_heartbeat);
            const newShift = getShiftName(startedAt);

            const machineSessionDir = path.join(DATA_DIR, `machine_${machineId}`, 'sessions');
            if (!fs.existsSync(machineSessionDir)) fs.mkdirSync(machineSessionDir, { recursive: true });

            const targetPath = path.join(machineSessionDir, `${prodDate}.json`);
            let machineSessions = [];
            if (fs.existsSync(targetPath)) {
                machineSessions = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
            }

            // Avoid duplicates by session_id
            const existingIdx = machineSessions.findIndex(s => String(s.session_id) === String(session.session_id));
            const updatedSession = {
                ...session,
                started_at: tunisiaStart,
                ended_at: tunisiaEnd,
                last_heartbeat: tunisiaHB,
                shift: newShift,
                migrated_at: new Date().toISOString()
            };

            if (existingIdx >= 0) {
                machineSessions[existingIdx] = updatedSession;
            } else {
                machineSessions.push(updatedSession);
            }

            fs.writeFileSync(targetPath, JSON.stringify(machineSessions, null, 2));
        }
        console.log("✅ Sessions migrated.");
    }

    // 2. Migrate Needle Logs
    console.log("📂 Scanning for machine directories...");
    const machineDirs = fs.readdirSync(DATA_DIR).filter(d => d.startsWith('machine_') && fs.statSync(path.join(DATA_DIR, d)).isDirectory());
    console.log(`📂 Found ${machineDirs.length} machine directories.`);

    for (const mDir of machineDirs) {
        const machineId = mDir.split('_')[1];
        const logFiles = fs.readdirSync(path.join(DATA_DIR, mDir)).filter(f => f.endsWith('.json') && f !== 'sessions');

        if (logFiles.length === 0) continue;
        console.log(`🔍 Processing ${logFiles.length} log files for ${mDir}...`);

        const allLogs = [];
        for (const logFile of logFiles) {
            const filePath = path.join(DATA_DIR, mDir, logFile);
            try {
                const logs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                allLogs.push(...logs);
                fs.unlinkSync(filePath);
            } catch (e) {
                console.error(`❌ Error processing ${filePath}:`, e.message);
            }
        }

        // Regroup all logs by production date
        const groupedLogs = {};
        for (const log of allLogs) {
            const logTime = log.operator_press_time || log.timestamp || log.start_time;
            if (!logTime) continue;

            const prodDate = getProductionDate(logTime);

            if (!groupedLogs[prodDate]) groupedLogs[prodDate] = [];

            groupedLogs[prodDate].push({
                ...log,
                operator_press_time: toTunisiaISO(log.operator_press_time),
                cycle_start_time: toTunisiaISO(log.cycle_start_time),
                cycle_end_time: toTunisiaISO(log.cycle_end_time),
                supervisor_scan_time: toTunisiaISO(log.supervisor_scan_time),
                updated_at: toTunisiaISO(log.updated_at),
                timestamp: toTunisiaISO(log.timestamp),
                migrated: true
            });
        }

        // Save regrouped logs
        for (const [date, logs] of Object.entries(groupedLogs)) {
            const targetPath = path.join(DATA_DIR, mDir, `${date}.json`);
            fs.writeFileSync(targetPath, JSON.stringify(logs, null, 2));
        }

        console.log(`✅ ${mDir} logs regrouped and saved.`);
    }

    console.log("✨ Migration Complete!");

    console.log("Note: machine_sessions.json combined data has been distributed. You can now delete the root file manually after verification.");
}

migrate().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
