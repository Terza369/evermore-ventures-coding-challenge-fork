import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { seedRecurrenceTestDatabase } from './fixtures';

const envFile = path.join(__dirname, '.test-env.json');
const testEnv = JSON.parse(fs.readFileSync(envFile, 'utf-8'));
process.env.DATABASE_URL = testEnv.DATABASE_URL;

describe('Recurring Events (e2e)', () => {
   let app: INestApplication;
   let seededEvents: Awaited<ReturnType<typeof seedRecurrenceTestDatabase>>;

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
      seededEvents = await seedRecurrenceTestDatabase(app);
   });

   afterAll(async () => {
      await app.close();
   });

   const weeklyStandup = () => seededEvents[0];
   const oneOffMeeting = () => seededEvents[1];

   describe('POST /api/events — recurring creation', () => {
      it('should create a weekly recurring event and return recurrence fields', async () => {
         const input = {
            title: 'New Weekly',
            startTime: '2030-05-01T10:00:00.000Z',
            endTime: '2030-05-01T11:00:00.000Z',
            timezone: 'Europe/Zagreb',
            recurrenceRule: 'WEEKLY',
            recurrenceEnd: '2030-06-01T11:00:00.000Z',
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(201);

         expect(body.recurrenceRule).toBe('WEEKLY');
         expect(body.recurrenceEnd).toBeDefined();
         expect(new Date(body.recurrenceEnd).toISOString()).toBe(input.recurrenceEnd);
      });

      it('should reject recurrenceRule without recurrenceEnd with 400', async () => {
         const input = {
            title: 'Missing End',
            startTime: '2030-05-01T10:00:00.000Z',
            endTime: '2030-05-01T11:00:00.000Z',
            timezone: 'UTC',
            recurrenceRule: 'WEEKLY',
         };

         await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(400);
      });

      it('should reject recurrenceEnd without recurrenceRule with 400', async () => {
         const input = {
            title: 'Missing Rule',
            startTime: '2030-05-01T10:00:00.000Z',
            endTime: '2030-05-01T11:00:00.000Z',
            timezone: 'UTC',
            recurrenceEnd: '2030-06-01T11:00:00.000Z',
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(400);

         expect(body.message).toContain('recurrenceRule is required when recurrenceEnd is set');
      });

      it('should reject recurrenceEnd <= endTime with 400', async () => {
         const input = {
            title: 'End Too Early',
            startTime: '2030-05-01T10:00:00.000Z',
            endTime: '2030-05-01T11:00:00.000Z',
            timezone: 'UTC',
            recurrenceRule: 'WEEKLY',
            recurrenceEnd: '2030-05-01T10:30:00.000Z',
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(400);

         expect(body.message).toContain('recurrenceEnd must be after endTime');
      });

      it('should reject invalid recurrenceRule value with 400', async () => {
         const input = {
            title: 'Bad Rule',
            startTime: '2030-05-01T10:00:00.000Z',
            endTime: '2030-05-01T11:00:00.000Z',
            timezone: 'UTC',
            recurrenceRule: 'DAILY',
            recurrenceEnd: '2030-06-01T11:00:00.000Z',
         };

         await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(400);
      });

      it('should reject recurring event that conflicts with a non-recurring event with 409', async () => {
         const input = {
            title: 'Conflicting Weekly',
            startTime: '2030-03-05T14:30:00.000Z',
            endTime: '2030-03-05T15:30:00.000Z',
            timezone: 'UTC',
            recurrenceRule: 'WEEKLY',
            recurrenceEnd: '2030-04-05T15:30:00.000Z',
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(409);

         expect(body.conflictingEvent).toBeDefined();
         expect(body.conflictingEvent.title).toBe('One-off Meeting');
      });

      it('should reject recurring event that conflicts with another recurring event with 409', async () => {
         const input = {
            title: 'Conflicting Recurring',
            startTime: '2030-03-04T09:15:00.000Z',
            endTime: '2030-03-04T09:45:00.000Z',
            timezone: 'UTC',
            recurrenceRule: 'WEEKLY',
            recurrenceEnd: '2030-04-08T09:45:00.000Z',
         };

         const { body } = await request(app.getHttpServer())
            .post('/api/events')
            .send(input)
            .expect(409);

         expect(body.conflictingEvent).toBeDefined();
         expect(body.conflictingEvent.title).toBe('Weekly Standup');
      });
   });

   describe('GET /api/events — occurrence expansion', () => {
      it('should return expanded occurrences for a recurring event', async () => {
         const { body } = await request(app.getHttpServer())
            .get('/api/events')
            .query({
               from: '2030-03-01T00:00:00.000Z',
               to: '2030-04-15T00:00:00.000Z',
            })
            .expect(200);

         const standupOccurrences = body.filter((event: { title: string }) =>
            event.title === 'Weekly Standup'
         );
         expect(standupOccurrences).toHaveLength(5);
      });

      it('should give each occurrence a synthetic id in format uuid_isoDate', async () => {
         const { body } = await request(app.getHttpServer())
            .get('/api/events')
            .query({
               from: '2030-03-01T00:00:00.000Z',
               to: '2030-04-15T00:00:00.000Z',
            })
            .expect(200);

         const standupOccurrences = body.filter((event: { title: string }) =>
            event.title === 'Weekly Standup'
         );

         for (const occurrence of standupOccurrences) {
            const parts = occurrence.id.split('_');
            expect(parts.length).toBeGreaterThanOrEqual(2);
            expect(parts[0]).toBe(weeklyStandup().id);
         }
      });

      it('should return occurrences sorted by startTime across recurring and non-recurring', async () => {
         const { body } = await request(app.getHttpServer())
            .get('/api/events')
            .query({
               from: '2030-03-01T00:00:00.000Z',
               to: '2030-04-15T00:00:00.000Z',
            })
            .expect(200);

         const startTimes = body.map((event: { startTime: string }) =>
            new Date(event.startTime).getTime()
         );
         expect(startTimes).toEqual([...startTimes].sort((a, b) => a - b));
      });

      it('should only return occurrences within the from/to window', async () => {
         const { body } = await request(app.getHttpServer())
            .get('/api/events')
            .query({
               from: '2030-03-10T00:00:00.000Z',
               to: '2030-03-24T00:00:00.000Z',
            })
            .expect(200);

         const standupOccurrences = body.filter((event: { title: string }) =>
            event.title === 'Weekly Standup'
         );
         expect(standupOccurrences).toHaveLength(2);
         expect(body).toHaveLength(2);
      });

      it('should not return occurrences after recurrenceEnd', async () => {
         const { body } = await request(app.getHttpServer())
            .get('/api/events')
            .query({
               from: '2030-04-10T00:00:00.000Z',
               to: '2030-05-01T00:00:00.000Z',
            })
            .expect(200);

         const standupOccurrences = body.filter((event: { title: string }) =>
            event.title === 'Weekly Standup'
         );
         expect(standupOccurrences).toHaveLength(0);
      });
   });

   describe('GET /api/events/:id — template lookup', () => {
      it('should return the original template when fetched by UUID', async () => {
         const { body } = await request(app.getHttpServer())
            .get(`/api/events/${weeklyStandup().id}`)
            .expect(200);

         expect(body.id).toBe(weeklyStandup().id);
         expect(body.title).toBe('Weekly Standup');
         expect(body.recurrenceRule).toBe('WEEKLY');
         expect(body.recurrenceEnd).toBeDefined();
      });

      it('should return 404 for a synthetic occurrence id', async () => {
         const syntheticId = `${weeklyStandup().id}_2030-03-11T09:00:00.000Z`;

         await request(app.getHttpServer())
            .get(`/api/events/${syntheticId}`)
            .expect(404);
      });
   });

   describe('PATCH /api/events/:id — recurring updates', () => {
      it('should update title and reflect it in all occurrences', async () => {
         await request(app.getHttpServer())
            .patch(`/api/events/${weeklyStandup().id}`)
            .send({ title: 'Renamed Standup' })
            .expect(200);

         const { body } = await request(app.getHttpServer())
            .get('/api/events')
            .query({
               from: '2030-03-01T00:00:00.000Z',
               to: '2030-04-15T00:00:00.000Z',
            })
            .expect(200);

         const occurrences = body.filter((event: { title: string }) =>
            event.title === 'Renamed Standup'
         );
         expect(occurrences).toHaveLength(5);
      });

      it('should shift all occurrences when startTime/endTime are updated', async () => {
         await request(app.getHttpServer())
            .patch(`/api/events/${weeklyStandup().id}`)
            .send({
               startTime: '2030-03-04T10:00:00.000Z',
               endTime: '2030-03-04T10:30:00.000Z',
            })
            .expect(200);

         const { body } = await request(app.getHttpServer())
            .get('/api/events')
            .query({
               from: '2030-03-01T00:00:00.000Z',
               to: '2030-04-15T00:00:00.000Z',
            })
            .expect(200);

         const occurrences = body.filter((event: { title: string }) =>
            event.title === 'Weekly Standup'
         );
         expect(occurrences).toHaveLength(5);
         for (const occurrence of occurrences) {
            expect(new Date(occurrence.startTime).getUTCHours()).toBe(10);
         }
      });

      it('should remove recurrence and become a single event', async () => {
         await request(app.getHttpServer())
            .patch(`/api/events/${weeklyStandup().id}`)
            .send({ recurrenceRule: null, recurrenceEnd: null })
            .expect(200);

         const { body } = await request(app.getHttpServer())
            .get('/api/events')
            .query({
               from: '2030-03-01T00:00:00.000Z',
               to: '2030-04-15T00:00:00.000Z',
            })
            .expect(200);

         const standups = body.filter((event: { title: string }) =>
            event.title === 'Weekly Standup'
         );
         expect(standups).toHaveLength(1);
         expect(standups[0].recurrenceRule).toBeNull();
      });

      it('should add recurrence to a non-recurring event', async () => {
         await request(app.getHttpServer())
            .patch(`/api/events/${oneOffMeeting().id}`)
            .send({
               recurrenceRule: 'WEEKLY',
               recurrenceEnd: '2030-04-05T15:00:00.000Z',
            })
            .expect(200);

         const { body } = await request(app.getHttpServer())
            .get('/api/events')
            .query({
               from: '2030-03-01T00:00:00.000Z',
               to: '2030-04-15T00:00:00.000Z',
            })
            .expect(200);

         const meetings = body.filter((event: { title: string }) =>
            event.title === 'One-off Meeting'
         );
         expect(meetings.length).toBeGreaterThan(1);
      });

      it('should reject update that creates a conflict with 409', async () => {
         const { body } = await request(app.getHttpServer())
            .patch(`/api/events/${oneOffMeeting().id}`)
            .send({
               startTime: '2030-03-04T09:15:00.000Z',
               endTime: '2030-03-04T09:45:00.000Z',
            })
            .expect(409);

         expect(body.conflictingEvent).toBeDefined();
      });
   });

   describe('DELETE /api/events/:id — recurring deletion', () => {
      it('should delete template and remove all occurrences', async () => {
         await request(app.getHttpServer())
            .delete(`/api/events/${weeklyStandup().id}`)
            .expect(204);

         const { body } = await request(app.getHttpServer())
            .get('/api/events')
            .query({
               from: '2030-03-01T00:00:00.000Z',
               to: '2030-04-15T00:00:00.000Z',
            })
            .expect(200);

         const standups = body.filter((event: { title: string }) =>
            event.title === 'Weekly Standup'
         );
         expect(standups).toHaveLength(0);
      });

      it('should return 204 when deleting a recurring event template', async () => {
         await request(app.getHttpServer())
            .delete(`/api/events/${weeklyStandup().id}`)
            .expect(204);

         await request(app.getHttpServer())
            .get(`/api/events/${weeklyStandup().id}`)
            .expect(404);
      });
   });
});
