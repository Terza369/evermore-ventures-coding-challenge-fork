import { generateOccurrences } from './events.utils';
import type { EventModel as Event } from '../../prisma/generated/models';

function makeEvent(overrides: Partial<Event> = {}): Event {
   return {
      id: 'test-uuid',
      title: 'Test Event',
      startTime: new Date('2030-03-04T09:00:00.000Z'),
      endTime: new Date('2030-03-04T10:00:00.000Z'),
      timezone: 'UTC',
      recurrenceRule: 'WEEKLY',
      recurrenceEnd: new Date('2030-04-01T10:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
   };
}

describe('generateOccurrences', () => {
   it('should return a non-recurring event as-is', () => {
      const event = makeEvent({ recurrenceRule: null, recurrenceEnd: null });
      const rangeStart = new Date('2030-01-01T00:00:00.000Z');
      const rangeEnd = new Date('2030-12-31T00:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(event);
   });

   it('should expand weekly occurrences within the range', () => {
      const event = makeEvent();
      const rangeStart = new Date('2030-03-01T00:00:00.000Z');
      const rangeEnd = new Date('2030-04-15T00:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      expect(result).toHaveLength(5);
      expect(result[0].startTime).toEqual(new Date('2030-03-04T09:00:00.000Z'));
      expect(result[4].startTime).toEqual(new Date('2030-04-01T09:00:00.000Z'));
   });

   it('should give each occurrence a synthetic id', () => {
      const event = makeEvent();
      const rangeStart = new Date('2030-03-01T00:00:00.000Z');
      const rangeEnd = new Date('2030-04-15T00:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      for (const occurrence of result) {
         expect(occurrence.id).toMatch(/^test-uuid_/);
         expect(occurrence.id).not.toBe('test-uuid');
      }
      const ids = result.map((occurrence) => occurrence.id);
      expect(new Set(ids).size).toBe(ids.length);
   });

   it('should include an occurrence that starts before rangeStart but ends within it', () => {
      const event = makeEvent({
         recurrenceEnd: new Date('2030-03-05T10:00:00.000Z'),
      });
      const rangeStart = new Date('2030-03-04T09:30:00.000Z');
      const rangeEnd = new Date('2030-03-04T11:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      expect(result).toHaveLength(1);
      expect(result[0].startTime).toEqual(new Date('2030-03-04T09:00:00.000Z'));
   });

   it('should return empty when range falls entirely between occurrences', () => {
      const event = makeEvent();
      const rangeStart = new Date('2030-03-05T00:00:00.000Z');
      const rangeEnd = new Date('2030-03-07T00:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      expect(result).toHaveLength(0);
   });

   it('should produce exactly one occurrence when recurrenceEnd barely allows it', () => {
      const event = makeEvent({
         recurrenceEnd: new Date(new Date('2030-03-04T09:00:00.000Z').getTime() + 1),
      });
      const rangeStart = new Date('2030-03-01T00:00:00.000Z');
      const rangeEnd = new Date('2030-04-01T00:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      expect(result).toHaveLength(1);
   });

   it('should return empty when recurrenceEnd equals startTime', () => {
      const event = makeEvent({
         recurrenceEnd: new Date('2030-03-04T09:00:00.000Z'),
      });
      const rangeStart = new Date('2030-03-01T00:00:00.000Z');
      const rangeEnd = new Date('2030-04-01T00:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      expect(result).toHaveLength(0);
   });

   it('should preserve all event fields on each occurrence', () => {
      const event = makeEvent({ title: 'Preserved Fields', timezone: 'Europe/Zagreb' });
      const rangeStart = new Date('2030-03-01T00:00:00.000Z');
      const rangeEnd = new Date('2030-04-15T00:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      for (const occurrence of result) {
         expect(occurrence.title).toBe('Preserved Fields');
         expect(occurrence.timezone).toBe('Europe/Zagreb');
         expect(occurrence.recurrenceRule).toBe('WEEKLY');
         expect(occurrence.recurrenceEnd).toEqual(event.recurrenceEnd);
      }
   });

   it('should handle an event whose duration exceeds 7 days without infinite loop', () => {
      const event = makeEvent({
         startTime: new Date('2030-03-04T00:00:00.000Z'),
         endTime: new Date('2030-03-12T00:00:00.000Z'),
         recurrenceEnd: new Date('2030-03-20T00:00:00.000Z'),
      });
      const rangeStart = new Date('2030-03-01T00:00:00.000Z');
      const rangeEnd = new Date('2030-04-01T00:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      expect(result).toHaveLength(3);
      for (const occurrence of result) {
         const durationMilliseconds = occurrence.endTime.getTime() - occurrence.startTime.getTime();
         expect(durationMilliseconds).toBe(8 * 24 * 60 * 60 * 1000);
      }
   });

   it('should clamp occurrences to recurrenceEnd when recurrenceEnd is earlier than rangeEnd', () => {
      const event = makeEvent({
         recurrenceEnd: new Date('2030-03-12T00:00:00.000Z'),
      });
      const rangeStart = new Date('2030-01-01T00:00:00.000Z');
      const rangeEnd = new Date('2030-12-31T00:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      expect(result).toHaveLength(2);
   });

   it('should clamp occurrences to rangeEnd when rangeEnd is earlier than recurrenceEnd', () => {
      const event = makeEvent({
         recurrenceEnd: new Date('2030-12-31T00:00:00.000Z'),
      });
      const rangeStart = new Date('2030-03-01T00:00:00.000Z');
      const rangeEnd = new Date('2030-03-12T00:00:00.000Z');

      const result = generateOccurrences(event, rangeStart, rangeEnd);

      expect(result).toHaveLength(2);
   });
});
