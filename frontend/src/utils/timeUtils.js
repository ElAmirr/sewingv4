/**
 * Formats a Date object as a Tunisia ISO string (+01:00).
 * Matches the backend format.
 */
export function toTunisiaISO(date = new Date()) {
    const localStr = date.toLocaleString('sv-SE', { timeZone: 'Africa/Tunis' }).replace(' ', 'T');
    return `${localStr}+01:00`;
}

/**
 * Calculates the current 2-hour cycle boundaries and color based on the given time.
 * @param {Date} timeNow 
 * @returns {Object} { cycleStart, cycleEnd, color, shift }
 */
export function getCycleInfo(timeNow) {
    const hourNow = timeNow.getHours();
    const cycleHour = hourNow - (hourNow % 2);

    // Create new Date objects for the boundaries in local time
    const cycleStart = new Date(timeNow);
    cycleStart.setHours(cycleHour, 0, 0, 0);

    const cycleEnd = new Date(cycleStart);
    cycleEnd.setHours(cycleStart.getHours() + 2);

    const cyclesSinceMidnight = Math.floor(cycleHour / 2);
    const colors = ["Blue", "Green", "Yellow", "Red"];
    const color = colors[cyclesSinceMidnight % colors.length];

    // compute local shift
    let shift = "Shift1"; // 22:00 - 06:00
    if (hourNow >= 6 && hourNow < 14) shift = "Shift2";
    else if (hourNow >= 14 && hourNow < 22) shift = "Shift3";

    return { cycleStart, cycleEnd, color, shift };
}
