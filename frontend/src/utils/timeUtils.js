/**
 * Formats a Date object as a Tunisia ISO string (+01:00).
 * Matches the backend format.
 */
export function toTunisiaISO(date = new Date()) {
    const localStr = date.toLocaleString('sv-SE', { timeZone: 'Africa/Tunis' }).replace(' ', 'T');
    return `${localStr}+01:00`;
}

/**
 * Finds which shift the given hour belongs to, using the schedule.
 */
function getShiftFromSchedule(dayOfWeek, hour, schedule) {
    const DEFAULT_FALLBACK = "Shift1";
    if (!schedule) return DEFAULT_FALLBACK;

    const group = Object.values(schedule).find(g => g.days && g.days.includes(dayOfWeek));
    if (!group) return DEFAULT_FALLBACK;

    const matched = group.shifts.find(s => {
        if (s.start < s.end) return hour >= s.start && hour < s.end;
        return hour >= s.start || hour < s.end; // overnight
    });

    return matched ? matched.name : DEFAULT_FALLBACK;
}

/**
 * Calculates the current 2-hour cycle boundaries and color based on the given time.
 * @param {Date} timeNow 
 * @param {string[]} colorSequence - Optional custom color order from the server.
 * @param {object|null} schedule - Optional schedule from the server.
 * @returns {Object} { cycleStart, cycleEnd, color, shift }
 */
export function getCycleInfo(timeNow, colorSequence = ["Blue", "Green", "Yellow", "Red"], schedule = null) {
    const hourNow = timeNow.getHours();
    const cycleHour = hourNow - (hourNow % 2);

    const cycleStart = new Date(timeNow);
    cycleStart.setHours(cycleHour, 0, 0, 0);

    const cycleEnd = new Date(cycleStart);
    cycleEnd.setHours(cycleStart.getHours() + 2);

    const cyclesSinceMidnight = Math.floor(cycleHour / 2);
    const color = colorSequence[cyclesSinceMidnight % colorSequence.length];

    const shift = getShiftFromSchedule(timeNow.getDay(), hourNow, schedule);

    return { cycleStart, cycleEnd, color, shift };
}
