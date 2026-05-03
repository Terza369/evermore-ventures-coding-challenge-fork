/**
 * Converts any ISO date string (with or without offset) into a
 * "YYYY-MM-DDTHH:mm" wall-clock string for the given IANA timezone.
 * Used to pre-fill <input type="datetime-local"> fields.
 */
export function toLocalInput(isoStr: string, timezone: string): string {
   const date = new Date(isoStr);
   if (isNaN(date.getTime())) return '';

   const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
   }).formatToParts(date);

   const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
   // en-GB hour "24" means midnight — normalize to "00"
   const hour = get('hour') === '24' ? '00' : get('hour');
   return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * Converts a wall-clock "YYYY-MM-DDTHH:mm" string in a given timezone
 * to a UTC ISO string.
 *
 * Strategy: create a UTC Date with the same numeric values, then use
 * Intl to find how that instant maps to the target timezone. The
 * difference tells us the timezone offset, which we apply to get the
 * correct UTC instant.
 */
export function fromLocalInput(localStr: string, timezone: string): string {
   const [datePart, timePart] = localStr.split('T');
   const [year, month, day] = datePart.split('-').map(Number);
   const [hour, minute] = timePart.split(':').map(Number);

   // Guess: pretend the wall-clock values are UTC
   const guessMs = Date.UTC(year, month - 1, day, hour, minute);

   // See what wall-clock time that UTC instant maps to in the target timezone
   const rendered = toLocalInput(new Date(guessMs).toISOString(), timezone);
   const [rDatePart, rTimePart] = rendered.split('T');
   const [rY, rM, rD] = rDatePart.split('-').map(Number);
   const [rH, rMin] = rTimePart.split(':').map(Number);

   // The offset is: rendered - wanted (all in UTC arithmetic to avoid browser TZ)
   const renderedMs = Date.UTC(rY, rM - 1, rD, rH, rMin);
   const offsetMs = renderedMs - guessMs;

   // Correct the guess by subtracting the offset
   return new Date(guessMs - offsetMs).toISOString();
}
