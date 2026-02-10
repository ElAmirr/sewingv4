/**
 * Calculates the current 2-hour cycle boundaries and color based on the given time.
 * @param {Date} timeNow 
 * @returns {Object} { cycleStart, cycleEnd, color, shift }
 */
export function getCycleInfo(timeNow) {
    const cycleHour = timeNow.getHours() - (timeNow.getHours() % 2);
    const cycleStart = new Date(timeNow);
    cycleStart.setHours(cycleHour, 0, 0, 0);

    const cycleEnd = new Date(cycleStart);
    cycleEnd.setHours(cycleStart.getHours() + 2);

    const cyclesSinceMidnight = Math.floor(cycleStart.getHours() / 2);
    const colors = ["Blue", "Green", "Yellow", "Red"];
    const color = colors[cyclesSinceMidnight % colors.length];

    // compute local shift
    const hour = timeNow.getHours();
    let shift = "Shift3";
    if (hour >= 6 && hour < 14) shift = "Shift1";
    else if (hour >= 14 && hour < 22) shift = "Shift2";

    return { cycleStart, cycleEnd, color, shift };
}
