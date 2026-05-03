import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { seedTestDatabase, TEST_EVENTS } from './fixtures';

// Load the DATABASE_URL written by globalSetup
const envFile = path.join(__dirname, '.test-env.json');
const testEnv = JSON.parse(fs.readFileSync(envFile, 'utf-8'));
process.env.DATABASE_URL = testEnv.DATABASE_URL;

describe('Events (e2e)', () => {
  let app: INestApplication;
  let seededEvents: Awaited<ReturnType<typeof seedTestDatabase>>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  beforeEach(async () => {
    seededEvents = await seedTestDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── GET /api/events ───────────────────────────────────────────────

  describe('GET /api/events', () => {
    it('should return all seeded events', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/events')
        .expect(200);

      expect(body).toHaveLength(TEST_EVENTS.length);
    });

    it('should filter by "from" query param', async () => {
      // Only events ending after Jan 16 00:00 → Sprint Planning
      const { body } = await request(app.getHttpServer())
        .get('/api/events')
        .query({ from: '2030-01-16T00:00:00.000Z' })
        .expect(200);

      expect(body).toHaveLength(1);
      expect(body[0].title).toBe('Sprint Planning');
    });

    it('should filter by "to" query param', async () => {
      // Only events starting before Jan 15 10:00 → Morning Standup
      const { body } = await request(app.getHttpServer())
        .get('/api/events')
        .query({ to: '2030-01-15T10:00:00.000Z' })
        .expect(200);

      expect(body).toHaveLength(1);
      expect(body[0].title).toBe('Morning Standup');
    });

    it('should filter by both "from" and "to"', async () => {
      // Range covering Jan 15 only → Morning Standup + Design Review
      const { body } = await request(app.getHttpServer())
        .get('/api/events')
        .query({
          from: '2030-01-15T00:00:00.000Z',
          to: '2030-01-16T00:00:00.000Z',
        })
        .expect(200);

      expect(body).toHaveLength(2);
      const titles = body.map((e: { title: string }) => e.title);
      expect(titles).toContain('Morning Standup');
      expect(titles).toContain('Design Review');
    });

    it('should return empty array when no events match', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/api/events')
        .query({ from: '2099-01-01T00:00:00.000Z' })
        .expect(200);

      expect(body).toHaveLength(0);
    });
  });

  // ─── GET /api/events/:id ──────────────────────────────────────────

  describe('GET /api/events/:id', () => {
    it('should return a single event by ID', async () => {
      const event = seededEvents[0];

      const { body } = await request(app.getHttpServer())
        .get(`/api/events/${event.id}`)
        .expect(200);

      expect(body.id).toBe(event.id);
      expect(body.title).toBe(event.title);
    });

    it('should return 404 for non-existent UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/events/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // ─── POST /api/events ─────────────────────────────────────────────

  describe('POST /api/events', () => {
    it('should create an event and return 201', async () => {
      const dto = {
        title: 'New Event',
        startTime: '2030-02-01T10:00:00.000Z',
        endTime: '2030-02-01T11:00:00.000Z',
        timezone: 'Europe/Zagreb',
      };

      const { body } = await request(app.getHttpServer())
        .post('/api/events')
        .send(dto)
        .expect(201);

      expect(body.id).toBeDefined();
      expect(body.title).toBe(dto.title);
      expect(body.timezone).toBe(dto.timezone);
    });

    it('should reject missing required fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/events')
        .send({ title: 'No times' })
        .expect(400);
    });

    it('should reject startTime >= endTime with 400', async () => {
      const dto = {
        title: 'Bad Range',
        startTime: '2030-02-01T12:00:00.000Z',
        endTime: '2030-02-01T10:00:00.000Z',
        timezone: 'UTC',
      };

      await request(app.getHttpServer())
        .post('/api/events')
        .send(dto)
        .expect(400);
    });

    it('should reject invalid timezone with 400', async () => {
      const dto = {
        title: 'Bad TZ',
        startTime: '2030-02-01T10:00:00.000Z',
        endTime: '2030-02-01T11:00:00.000Z',
        timezone: 'Fake/Zone',
      };

      await request(app.getHttpServer())
        .post('/api/events')
        .send(dto)
        .expect(400);
    });

    it('should reject overlapping event with 409', async () => {
      // Overlaps with "Morning Standup" (09:00–09:30)
      const dto = {
        title: 'Conflict',
        startTime: '2030-01-15T09:15:00.000Z',
        endTime: '2030-01-15T09:45:00.000Z',
        timezone: 'Europe/Zagreb',
      };

      const { body } = await request(app.getHttpServer())
        .post('/api/events')
        .send(dto)
        .expect(409);

      expect(body.conflictingEvent).toBeDefined();
      expect(body.conflictingEvent.title).toBe('Morning Standup');
    });

    it('should allow touching events (end === start)', async () => {
      // Starts exactly when "Morning Standup" ends (09:30)
      const dto = {
        title: 'Right After Standup',
        startTime: '2030-01-15T09:30:00.000Z',
        endTime: '2030-01-15T10:00:00.000Z',
        timezone: 'Europe/Zagreb',
      };

      await request(app.getHttpServer())
        .post('/api/events')
        .send(dto)
        .expect(201);
    });
  });

  // ─── PATCH /api/events/:id ────────────────────────────────────────

  describe('PATCH /api/events/:id', () => {
    it('should update title only', async () => {
      const event = seededEvents[0];

      const { body } = await request(app.getHttpServer())
        .patch(`/api/events/${event.id}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(body.title).toBe('Updated Title');
      // Times should remain unchanged
      expect(new Date(body.startTime).toISOString()).toBe(
        event.startTime.toISOString(),
      );
    });

    it('should update time range', async () => {
      const event = seededEvents[0];
      const newStart = '2030-03-01T10:00:00.000Z';
      const newEnd = '2030-03-01T11:00:00.000Z';

      const { body } = await request(app.getHttpServer())
        .patch(`/api/events/${event.id}`)
        .send({ startTime: newStart, endTime: newEnd })
        .expect(200);

      expect(new Date(body.startTime).toISOString()).toBe(newStart);
      expect(new Date(body.endTime).toISOString()).toBe(newEnd);
    });

    it('should reject conflict with other events', async () => {
      const event = seededEvents[0]; // Morning Standup

      // Move it to overlap with Design Review (14:00–15:00)
      await request(app.getHttpServer())
        .patch(`/api/events/${event.id}`)
        .send({
          startTime: '2030-01-15T14:30:00.000Z',
          endTime: '2030-01-15T15:30:00.000Z',
        })
        .expect(409);
    });

    it('should allow self-overlap (updating own times)', async () => {
      const event = seededEvents[0]; // Morning Standup 09:00–09:30

      // Shift by 5 minutes — still overlaps with original self
      const { body } = await request(app.getHttpServer())
        .patch(`/api/events/${event.id}`)
        .send({
          startTime: '2030-01-15T09:05:00.000Z',
          endTime: '2030-01-15T09:35:00.000Z',
        })
        .expect(200);

      expect(new Date(body.startTime).toISOString()).toBe(
        '2030-01-15T09:05:00.000Z',
      );
    });

    it('should return 404 for non-existent ID', async () => {
      await request(app.getHttpServer())
        .patch('/api/events/00000000-0000-0000-0000-000000000000')
        .send({ title: 'Ghost' })
        .expect(404);
    });
  });

  // ─── DELETE /api/events/:id ───────────────────────────────────────

  describe('DELETE /api/events/:id', () => {
    it('should delete an event and return 204', async () => {
      const event = seededEvents[0];

      await request(app.getHttpServer())
        .delete(`/api/events/${event.id}`)
        .expect(204);
    });

    it('should confirm event is gone after delete', async () => {
      const event = seededEvents[0];

      await request(app.getHttpServer())
        .delete(`/api/events/${event.id}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/events/${event.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent ID', async () => {
      await request(app.getHttpServer())
        .delete('/api/events/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });
});
