import { BadRequestException } from '@nestjs/common';
import type { EventModel as Event } from '../../prisma/generated/models';

const WEEK_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

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
 * - recurrenceEnd must be after endTime (so at least one full occurrence fits).
 */
export function validateRecurrence(
   recurrenceRule: string | undefined | null,
   recurrenceEnd: Date | undefined | null,
   endTime: Date
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

   if (recurrenceEnd && recurrenceEnd <= endTime) {
      throw new BadRequestException(
         'recurrenceEnd must be after endTime'
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
export function generateOccurrences(
   event: Event,
   rangeStart: Date,
   rangeEnd: Date
): Event[] {
   if (!event.recurrenceRule) {
      return [event];
   }

   const durationMilliseconds = event.endTime.getTime() - event.startTime.getTime();
   const occurrences: Event[] = [];
   let cursorMilliseconds = event.startTime.getTime();
   const upperBoundMilliseconds = event.recurrenceEnd && event.recurrenceEnd < rangeEnd
      ? event.recurrenceEnd.getTime()
      : rangeEnd.getTime();

   while (cursorMilliseconds < upperBoundMilliseconds) {
      const occurrenceEndMilliseconds = cursorMilliseconds + durationMilliseconds;

      if (cursorMilliseconds < rangeEnd.getTime() && occurrenceEndMilliseconds > rangeStart.getTime()) {
         const occurrenceStart = new Date(cursorMilliseconds);
         occurrences.push({
            ...event,
            id: `${event.id}_${occurrenceStart.toISOString()}`,
            startTime: occurrenceStart,
            endTime: new Date(occurrenceEndMilliseconds),
         });
      }

      cursorMilliseconds += WEEK_MILLISECONDS;
   }

   return occurrences;
}
