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
 * Wipes all events and seeds the database with deterministic fixtures.
 * Returns the created events (with their generated IDs).
 */
export async function seedTestDatabase(app: INestApplication) {
  const prisma = app.get(PrismaService);
  await prisma.event.deleteMany();

  const created = await Promise.all(
    TEST_EVENTS.map((event) =>
      prisma.event.create({
        data: {
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          timezone: event.timezone,
        },
      }),
    ),
  );

  return created;
}
