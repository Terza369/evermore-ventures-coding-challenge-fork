import { BadRequestException } from '@nestjs/common';
import type { EventModel as Event } from '../../prisma/generated/models';

/**
 * Validates that startTime is strictly before endTime.
 */
export function validateTimeRange(startTime: Date, endTime: Date) {
   if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
   }
}

/**
 * Validates that the timezone string is a valid IANA timezone.
 * Uses Intl.DateTimeFormat — an invalid timezone will throw a RangeError.
 */
export function validateTimezone(timezone: string) {
   try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
   } catch {
      throw new BadRequestException(
         `Invalid timezone: "${timezone}". Must be a valid IANA timezone (e.g., "Europe/London", "Asia/Kolkata")`
      );
   }
}

/**
 * Validates recurrence fields.
 * - If recurrenceRule is set, recurrenceEnd must also be set.
 * - recurrenceEnd must be after startTime.
 */
export function validateRecurrence(
   recurrenceRule: string | undefined | null,
   recurrenceEnd: Date | undefined | null,
   startTime: Date
) {
   if (recurrenceRule && !recurrenceEnd) {
      throw new BadRequestException(
         'recurrenceEnd is required when recurrenceRule is set'
      );
   }

   if (recurrenceEnd && !recurrenceRule) {
      throw new BadRequestException(
         'recurrenceRule is required when recurrenceEnd is set'
      );
   }

   if (recurrenceEnd && recurrenceEnd <= startTime) {
      throw new BadRequestException(
         'recurrenceEnd must be after startTime'
      );
   }
}

/**
 * Expands a single event into its occurrences within [rangeStart, rangeEnd).
 *
 * - Non-recurring events are returned as-is (single-element array).
 * - WEEKLY recurring events are expanded in 7-day steps from startTime
 *   until recurrenceEnd or rangeEnd, whichever comes first.
 *
 * Each occurrence has the same shape as the DB Event entity.
 * Recurring occurrences get a synthetic id: `${parentId}_${occurrenceStart.toISOString()}`.
 */
export function expandRecurrences(
   event: Event,
   rangeStart: Date,
   rangeEnd: Date
): Event[] {
   if (!event.recurrenceRule) {
      return [event];
   }

   const durationMs = event.endTime.getTime() - event.startTime.getTime();
   const occurrences: Event[] = [];
   const cursor = new Date(event.startTime);
   const upperBound = event.recurrenceEnd && event.recurrenceEnd < rangeEnd
      ? event.recurrenceEnd
      : rangeEnd;

   while (cursor < upperBound) {
      const occStart = new Date(cursor);
      const occEnd = new Date(cursor.getTime() + durationMs);

      // Does this occurrence overlap the query window?
      if (occStart < rangeEnd && occEnd > rangeStart) {
         occurrences.push({
            ...event,
            id: `${event.id}_${occStart.toISOString()}`,
            startTime: occStart,
            endTime: occEnd,
         });
      }

      // Advance by 7 days
      cursor.setDate(cursor.getDate() + 7);
   }

   return occurrences;
}

