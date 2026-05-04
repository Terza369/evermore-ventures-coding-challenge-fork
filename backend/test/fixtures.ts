import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';

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

export const RECURRENCE_TEST_EVENTS = [
   {
      title: 'Weekly Standup',
      startTime: new Date('2030-03-04T09:00:00.000Z'),
      endTime: new Date('2030-03-04T09:30:00.000Z'),
      timezone: 'Europe/Zagreb',
      recurrenceRule: 'WEEKLY',
      recurrenceEnd: new Date('2030-04-02T00:00:00.000Z'),
   },
   {
      title: 'One-off Meeting',
      startTime: new Date('2030-03-05T14:00:00.000Z'),
      endTime: new Date('2030-03-05T15:00:00.000Z'),
      timezone: 'America/New_York',
   },
] as const;

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
