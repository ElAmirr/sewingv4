/**
 * Time utility for Tunisia (GMT+1) and Production Date logic.
 */

/**
 * Returns the current Tunisia time as an ISO string with +01:00 offset.
 * Format: YYYY-MM-DDTHH:mm:ss+01:00
 */
export function getTunisiaISO(date = new Date()) {
    const localStr = date.toLocaleString('sv-SE', { timeZone: 'Africa/Tunis' }).replace(' ', 'T');
    return `${localStr}+01:00`;
}

/**
 * Returns the current Tunisia date as YYYY-MM-DD.
 */
export function getTunisiaDate(date = new Date()) {
    return date.toLocaleDateString('sv-SE', { timeZone: 'Africa/Tunis' });
}

/**
 * Returns the "Production Date".
 * Shift 1 (22:00 to 06:00 local) belongs to the NEXT day.
 * If local time is between 22:00 and 00:00, the production date is TOMORROW.
 */
export function getProductionDate(date = new Date()) {
    const tunisiaHour = Number(date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Africa/Tunis' }));

    const d = new Date(date);
    if (tunisiaHour >= 22) {
        d.setDate(d.getDate() + 1);
    }

    return d.toLocaleDateString('sv-SE', { timeZone: 'Africa/Tunis' });
}
