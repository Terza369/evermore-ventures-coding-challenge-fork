import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Deterministic test fixtures with fixed timestamps in 2030.
 * All non-overlapping so individual tests can create conflicts as needed.
 */
export const TEST_EVENTS = [
   {
      title: 'Morning Standup',
      startTime: new Date('2030-01-15T09:00:00.000Z'),
      endTime: new Date('2030-01-15T09:30:00.000Z'),
      timezone: 'Europe/Zagreb',
   },
   {
      title: 'Design Review',
      startTime: new Date('2030-01-15T14:00:00.000Z'),
      endTime: new Date('2030-01-15T15:00:00.000Z'),
      timezone: 'America/New_York',
   },
   {
      title: 'Sprint Planning',
      startTime: new Date('2030-01-16T10:00:00.000Z'),
      endTime: new Date('2030-01-16T12:00:00.000Z'),
      timezone: 'Europe/London',
   },
] as const;

/**
 * Recurring test fixtures in 2030-03, separate from the non-recurring 2030-01 fixtures.
 * "Weekly Standup" recurs every Monday 09:00–09:30 for 5 weeks (Mar 3 → Apr 7).
 * "One-off Meeting" is a non-recurring event on a Wednesday to avoid conflicts.
 */
export const RECURRENCE_TEST_EVENTS = [
   {
      title: 'Weekly Standup',
      startTime: new Date('2030-03-04T09:00:00.000Z'),
      endTime: new Date('2030-03-04T09:30:00.000Z'),
      timezone: 'Europe/Zagreb',
      recurrenceRule: 'WEEKLY',
      recurrenceEnd: new Date('2030-04-02T00:00:00.000Z'), // 5 weeks of occurrences (Mar 4, 11, 18, 25, Apr 1)
   },
   {
      title: 'One-off Meeting',
      startTime: new Date('2030-03-05T14:00:00.000Z'),
      endTime: new Date('2030-03-05T15:00:00.000Z'),
      timezone: 'America/New_York',
   },
] as const;

/**
 * Wipes all events and seeds the database with deterministic fixtures.
 * Uses sequential creation to guarantee insertion order matches TEST_EVENTS.
 * Returns the created events (with their generated IDs).
 */
export async function seedTestDatabase(app: INestApplication) {
   const prisma = app.get(PrismaService);
   await prisma.event.deleteMany();

   const created = [];
   for (const event of TEST_EVENTS) {
      created.push(
         await prisma.event.create({
            data: {
               title: event.title,
               startTime: event.startTime,
               endTime: event.endTime,
               timezone: event.timezone,
            },
         })
      );
   }

   return created;
}

/**
 * Wipes all events and seeds with recurring test fixtures.
 * Returns the created events (with their generated IDs).
 */
export async function seedRecurrenceTestDatabase(app: INestApplication) {
   const prisma = app.get(PrismaService);
   await prisma.event.deleteMany();

   const created = [];
   for (const event of RECURRENCE_TEST_EVENTS) {
      created.push(
         await prisma.event.create({
            data: {
               title: event.title,
               startTime: event.startTime,
               endTime: event.endTime,
               timezone: event.timezone,
               recurrenceRule: 'recurrenceRule' in event ? event.recurrenceRule : null,
               recurrenceEnd: 'recurrenceEnd' in event ? event.recurrenceEnd : null,
            },
         })
      );
   }

   return created;
}
