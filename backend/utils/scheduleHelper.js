import fs from "fs";
import path from "path";
import { getDataDir } from "./config.js";

const DEFAULT_SCHEDULE = {
    weekdays: {
        days: [1, 2, 3, 4, 5],
        shifts: [
            { name: "Shift1", start: 22, end: 6 },
            { name: "Shift2", start: 6, end: 14 },
            { name: "Shift3", start: 14, end: 22 }
        ]
    },
    saturday: {
        days: [6],
        shifts: [
            { name: "Shift2", start: 6, end: 12 },
            { name: "Shift3", start: 12, end: 18 }
        ]
    },
    sunday: {
        days: [0],
        shifts: [
            { name: "Shift1", start: 0, end: 24 }
        ]
    }
};

/**
 * Loads the schedule from data/schedule.json.
 * Falls back to the default schedule if the file is missing or invalid.
 */
export function loadSchedule() {
    try {
        const dataDir = getDataDir();
        const schedulePath = path.join(dataDir, "schedule.json");
        if (fs.existsSync(schedulePath)) {
            const raw = fs.readFileSync(schedulePath, "utf-8");
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error("[Schedule] Failed to load schedule.json, using default:", err.message);
    }
    return DEFAULT_SCHEDULE;
}

/**
 * Returns true if the given hour falls within the given shift.
 * Handles overnight shifts (e.g. start=22, end=6).
 */
function isInShift(hour, shift) {
    const { start, end } = shift;
    if (start < end) {
        // Normal shift (e.g. 06-14)
        return hour >= start && hour < end;
    } else {
        // Overnight shift (e.g. 22-06)
        return hour >= start || hour < end;
    }
}

/**
 * Gets the current shift name based on the given date and schedule.
 * @param {Date} date
 * @param {object} schedule - loaded schedule object
 * @returns {string} e.g. "Shift1", "Shift2", "Shift3"
 */
export function getShiftForDate(date, schedule = DEFAULT_SCHEDULE) {
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const hour = Number(date.toLocaleString("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: "Africa/Tunis"
    }));

    // Find which schedule group applies to this day
    const group = Object.values(schedule).find(g => g.days.includes(dayOfWeek));
    if (!group) return "Shift1"; // Fallback

    // Find which shift matches the current hour
    const matched = group.shifts.find(s => isInShift(hour, s));
    return matched ? matched.name : "Shift1";
}

/**
 * Computes all auto-logout trigger times (HH:MM, 1 min before shift end)
 * from the current schedule, for the given day of week.
 * @param {number} dayOfWeek - 0=Sun ... 6=Sat
 * @param {object} schedule
 * @returns {string[]} e.g. ["05:59", "13:59", "21:59"]
 */
export function getTriggerTimesForDay(dayOfWeek, schedule = DEFAULT_SCHEDULE) {
    const group = Object.values(schedule).find(g => g.days.includes(dayOfWeek));
    if (!group) return [];

    return group.shifts.map(shift => {
        const endHour = shift.end === 0 ? 23 : shift.end; // edge: midnight
        const triggerHour = (shift.end - 1 + 24) % 24;
        const hh = String(triggerHour).padStart(2, "0");
        return `${hh}:59`;
    });
}
