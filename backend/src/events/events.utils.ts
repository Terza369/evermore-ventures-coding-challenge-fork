import { BadRequestException } from '@nestjs/common';

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
      `Invalid timezone: "${timezone}". Must be a valid IANA timezone (e.g., "Europe/London", "Asia/Kolkata")`,
    );
  }
}
