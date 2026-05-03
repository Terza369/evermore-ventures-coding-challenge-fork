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
         })
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
         const { body } = await request(app.getHttpServer()).get('/api/events').expect(200);

         expect(body).toHaveLength(TEST_EVENTS.length);
         // Verify each event has the expected shape
         for (const event of body) {
            expect(event).toHaveProperty('id');
            expect(event).toHaveProperty('title');
            expect(event).toHaveProperty('startTime');
            expect(event).toHaveProperty('endTime');
            expect(event).toHaveProperty('timezone');
            expect(event).toHaveProperty('createdAt');
            expect(event).toHaveProperty('updatedAt');
         }
      });

      it('should return events ordered by startTime ascending', async () => {
         const { body } = await request(app.getHttpServer()).get('/api/events').expect(200);

         const startTimes = body.map((e: { startTime: string }) => new Date(e.startTime).getTime());
         expect(startTimes).toEqual([...startTimes].sort((a, b) => a - b));
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

         expect(body).toEqual([]);
      });
   });

   // ─── GET /api/events/:id ──────────────────────────────────────────

   describe('GET /api/events/:id', () => {
      it('should return a single event by ID with full shape', async () => {
         const event = seededEvents[0];

         const { body } = await request(app.getHttpServer())
            .get(`/api/events/${event.id}`)
            .expect(200);

         expect(body.id).toBe(event.id);
         expect(body.title).toBe(event.title);
         expect(new Date(body.startTime).toISOString()).toBe(event.startTime.toISOString());
         expect(new Date(body.endTime).toISOString()).toBe(event.endTime.toISOString());
         expect(body.timezone).toBe(event.timezone);
      });

      it('should return 404 with message for non-existent UUID', async () => {
         const { body } = await request(app.getHttpServer())
            .get('/api/events/00000000-0000-0000-0000-000000000000')
            .expect(404);

         expect(body.statusCode).toBe(404);
         expect(body.message).toContain('not found');
      });
   });

   // ─── POST /api/events ─────────────────────────────────────────────

   describe('POST /api/events', () => {
      it('should create an event and return 201 with full shape', async () => {
         const input = {
            title: 'New Event',
            startTime: '2030-02-01T10:00:00.000Z',
            endTime: '2030-02-01T11:00:00.000Z',
            timezone: 'Europe/Zagreb',
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(201);

         expect(body.id).toBeDefined();
         expect(body.title).toBe(input.title);
         expect(new Date(body.startTime).toISOString()).toBe(input.startTime);
         expect(new Date(body.endTime).toISOString()).toBe(input.endTime);
         expect(body.timezone).toBe(input.timezone);
         expect(body.createdAt).toBeDefined();
         expect(body.updatedAt).toBeDefined();
      });

      it('should persist the created event in the database', async () => {
         const input = {
            title: 'Persisted Event',
            startTime: '2030-02-01T10:00:00.000Z',
            endTime: '2030-02-01T11:00:00.000Z',
            timezone: 'Europe/Zagreb',
         };

         const { body: created } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(201);

         // Verify it's actually in the database
         const { body: fetched } = await request(app.getHttpServer())
            .get(`/api/events/${created.id}`)
            .expect(200);

         expect(fetched.title).toBe(input.title);
      });

      it('should reject missing required fields with 400 and validation messages', async () => {
         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send({ title: 'No times' })
            .expect(400);

         expect(body.statusCode).toBe(400);
         expect(body.message).toBeInstanceOf(Array);
         expect(body.message.length).toBeGreaterThan(0);
      });

      it('should reject completely empty body with 400', async () => {
         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send({})
            .expect(400);

         expect(body.statusCode).toBe(400);
         expect(body.message).toBeInstanceOf(Array);
      });

      it('should reject invalid date strings with 400', async () => {
         const input = {
            title: 'Bad Dates',
            startTime: 'not-a-date',
            endTime: 'also-not-a-date',
            timezone: 'Europe/Zagreb',
         };

         await request(app.getHttpServer()).post('/api/events').send(input).expect(400);
      });

      it('should reject startTime >= endTime with 400', async () => {
         const input = {
            title: 'Bad Range',
            startTime: '2030-02-01T12:00:00.000Z',
            endTime: '2030-02-01T10:00:00.000Z',
            timezone: 'UTC',
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(400);

         expect(body.message).toContain('Start time must be before end time');
      });

      it('should reject equal start and end times with 400', async () => {
         const input = {
            title: 'Zero Duration',
            startTime: '2030-02-01T10:00:00.000Z',
            endTime: '2030-02-01T10:00:00.000Z',
            timezone: 'UTC',
         };

         await request(app.getHttpServer()).post('/api/events').send(input).expect(400);
      });

      it('should reject invalid timezone with 400', async () => {
         const input = {
            title: 'Bad TZ',
            startTime: '2030-02-01T10:00:00.000Z',
            endTime: '2030-02-01T11:00:00.000Z',
            timezone: 'Fake/Zone',
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(400);

         expect(body.message).toContain('Invalid timezone');
      });

      it('should reject overlapping event with 409 and conflicting event details', async () => {
         // Overlaps with "Morning Standup" (09:00–09:30)
         const input = {
            title: 'Conflict',
            startTime: '2030-01-15T09:15:00.000Z',
            endTime: '2030-01-15T09:45:00.000Z',
            timezone: 'Europe/Zagreb',
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(409);

         expect(body.statusCode).toBe(409);
         expect(body.message).toContain('conflicts');
         expect(body.conflictingEvent).toBeDefined();
         expect(body.conflictingEvent.id).toBeDefined();
         expect(body.conflictingEvent.title).toBe('Morning Standup');
      });

      it('should allow touching events (end === start)', async () => {
         // Starts exactly when "Morning Standup" ends (09:30)
         const input = {
            title: 'Right After Standup',
            startTime: '2030-01-15T09:30:00.000Z',
            endTime: '2030-01-15T10:00:00.000Z',
            timezone: 'Europe/Zagreb',
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(201);

         expect(body.title).toBe('Right After Standup');
      });

      it('should strip unknown fields (whitelist validation)', async () => {
         const input = {
            title: 'Clean Event',
            startTime: '2030-02-01T10:00:00.000Z',
            endTime: '2030-02-01T11:00:00.000Z',
            timezone: 'Europe/Zagreb',
            hackerField: 'should-be-stripped',
            isAdmin: true,
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(201);

         expect(body.title).toBe('Clean Event');
         expect(body).not.toHaveProperty('hackerField');
         expect(body).not.toHaveProperty('isAdmin');
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
         expect(new Date(body.startTime).toISOString()).toBe(event.startTime.toISOString());
         expect(new Date(body.endTime).toISOString()).toBe(event.endTime.toISOString());
      });

      it('should accept empty body as a no-op update', async () => {
         const event = seededEvents[0];

         const { body } = await request(app.getHttpServer())
            .patch(`/api/events/${event.id}`)
            .send({})
            .expect(200);

         expect(body.title).toBe(event.title);
         expect(new Date(body.startTime).toISOString()).toBe(event.startTime.toISOString());
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
         const { body } = await request(app.getHttpServer())
            .patch(`/api/events/${event.id}`)
            .send({
               startTime: '2030-01-15T14:30:00.000Z',
               endTime: '2030-01-15T15:30:00.000Z',
            })
            .expect(409);

         expect(body.conflictingEvent).toBeDefined();
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

         expect(new Date(body.startTime).toISOString()).toBe('2030-01-15T09:05:00.000Z');
      });

      it('should return 404 with message for non-existent ID', async () => {
         const { body } = await request(app.getHttpServer())
            .patch('/api/events/00000000-0000-0000-0000-000000000000')
            .send({ title: 'Ghost' })
            .expect(404);

         expect(body.statusCode).toBe(404);
         expect(body.message).toContain('not found');
      });
   });

   // ─── DELETE /api/events/:id ───────────────────────────────────────

   describe('DELETE /api/events/:id', () => {
      it('should delete an event and return 204', async () => {
         const event = seededEvents[0];

         await request(app.getHttpServer()).delete(`/api/events/${event.id}`).expect(204);
      });

      it('should confirm event is gone after delete', async () => {
         const event = seededEvents[0];

         await request(app.getHttpServer()).delete(`/api/events/${event.id}`).expect(204);

         await request(app.getHttpServer()).get(`/api/events/${event.id}`).expect(404);
      });

      it('should reduce total event count after delete', async () => {
         const event = seededEvents[0];

         await request(app.getHttpServer()).delete(`/api/events/${event.id}`).expect(204);

         const { body } = await request(app.getHttpServer()).get('/api/events').expect(200);

         expect(body).toHaveLength(TEST_EVENTS.length - 1);
      });

      it('should return 404 for non-existent ID', async () => {
         const { body } = await request(app.getHttpServer())
            .delete('/api/events/00000000-0000-0000-0000-000000000000')
            .expect(404);

         expect(body.statusCode).toBe(404);
         expect(body.message).toContain('not found');
      });
   });
});
