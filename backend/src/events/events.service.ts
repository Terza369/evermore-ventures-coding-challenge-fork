import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService, Prisma } from '../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto, FindEventsDto } from './dto';
import {
   validateTimeRange,
   validateTimezone,
   validateRecurrence,
   generateOccurrences,
} from './events.utils';

const YEAR_MILLISECONDS = 365 * 24 * 60 * 60 * 1000;
const WEEK_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class EventsService {
   constructor(private readonly prisma: PrismaService) {}

   async findAll(input: FindEventsDto) {
      const rangeStart = input.from ? new Date(input.from) : new Date(0);
      const rangeEnd = input.to
         ? new Date(input.to)
         : new Date(Date.now() + YEAR_MILLISECONDS);

      const where: Prisma.EventWhereInput = {
         OR: [
            {
               recurrenceRule: null,
               startTime: { lt: rangeEnd },
               endTime: { gt: rangeStart },
            },
            {
               recurrenceRule: { not: null },
               startTime: { lt: rangeEnd },
               recurrenceEnd: { gt: rangeStart },
            },
         ],
      };

      const events = await this.prisma.event.findMany({
         where,
         orderBy: { startTime: 'asc' },
      });

      return events
         .flatMap((event) => generateOccurrences(event, rangeStart, rangeEnd))
         .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
   }

   async findOne(id: string) {
      const event = await this.prisma.event.findUnique({ where: { id } });

      if (!event) {
         throw new NotFoundException(`Event with id "${id}" not found`);
      }

      return event;
   }

   async create(input: CreateEventDto) {
      const startTime = new Date(input.startTime);
      const endTime = new Date(input.endTime);
      const recurrenceEnd = input.recurrenceEnd
         ? new Date(input.recurrenceEnd)
         : null;

      validateTimeRange(startTime, endTime);
      validateTimezone(input.timezone);
      validateRecurrence(input.recurrenceRule, recurrenceEnd, endTime);
      await this.checkForConflicts(
         startTime,
         endTime,
         input.recurrenceRule ?? null,
         recurrenceEnd
      );

      return this.prisma.event.create({
         data: {
            title: input.title,
            startTime,
            endTime,
            timezone: input.timezone,
            recurrenceRule: input.recurrenceRule ?? null,
            recurrenceEnd,
         },
      });
   }

   async update(id: string, input: UpdateEventDto) {
      const existing = await this.findOne(id);

      const startTime = input.startTime
         ? new Date(input.startTime)
         : existing.startTime;
      const endTime = input.endTime
         ? new Date(input.endTime)
         : existing.endTime;
      const recurrenceRule =
         input.recurrenceRule !== undefined
            ? (input.recurrenceRule ?? null)
            : existing.recurrenceRule;
      const recurrenceEnd =
         input.recurrenceEnd !== undefined
            ? (input.recurrenceEnd ? new Date(input.recurrenceEnd) : null)
            : existing.recurrenceEnd;

      validateTimeRange(startTime, endTime);
      if (input.timezone) {
         validateTimezone(input.timezone);
      }
      validateRecurrence(recurrenceRule, recurrenceEnd, endTime);
      await this.checkForConflicts(
         startTime,
         endTime,
         recurrenceRule,
         recurrenceEnd,
         id
      );

      return this.prisma.event.update({
         where: { id },
         data: {
            ...(input.title !== undefined && { title: input.title }),
            ...(input.startTime !== undefined && { startTime }),
            ...(input.endTime !== undefined && { endTime }),
            ...(input.timezone !== undefined && { timezone: input.timezone }),
            ...(input.recurrenceRule !== undefined && { recurrenceRule }),
            ...(input.recurrenceEnd !== undefined && { recurrenceEnd }),
         },
      });
   }

   async delete(id: string) {
      await this.findOne(id);
      return this.prisma.event.delete({ where: { id } });
   }

   /**
    * Checks for overlapping events, including expanded recurrence occurrences.
    *
    * @param excludeId - Event ID to exclude from the check (used during updates)
    */
   private async checkForConflicts(
      startTime: Date,
      endTime: Date,
      recurrenceRule: string | null,
      recurrenceEnd: Date | null,
      excludeId?: string
   ) {
      const conflictWindowStart = startTime;
      const conflictWindowEnd = recurrenceEnd ?? endTime;

      const candidates = await this.prisma.event.findMany({
         where: {
            ...(excludeId && { id: { not: excludeId } }),
            OR: [
               {
                  recurrenceRule: null,
                  startTime: { lt: conflictWindowEnd },
                  endTime: { gt: conflictWindowStart },
               },
               {
                  recurrenceRule: { not: null },
                  startTime: { lt: conflictWindowEnd },
                  recurrenceEnd: { gt: conflictWindowStart },
               },
            ],
         },
      });

      // Build the new event's occurrences
      const durationMilliseconds = endTime.getTime() - startTime.getTime();
      const newOccurrences: { startTime: Date; endTime: Date }[] = [];

      if (!recurrenceRule) {
         newOccurrences.push({ startTime, endTime });
      } else {
         let cursorMilliseconds = startTime.getTime();
         const upperBoundMilliseconds = recurrenceEnd && recurrenceEnd.getTime() < conflictWindowEnd.getTime()
            ? recurrenceEnd.getTime()
            : conflictWindowEnd.getTime();

         while (cursorMilliseconds < upperBoundMilliseconds) {
            const occurrenceEndMilliseconds = cursorMilliseconds + durationMilliseconds;
            if (cursorMilliseconds < conflictWindowEnd.getTime() && occurrenceEndMilliseconds > conflictWindowStart.getTime()) {
               newOccurrences.push({
                  startTime: new Date(cursorMilliseconds),
                  endTime: new Date(occurrenceEndMilliseconds),
               });
            }
            cursorMilliseconds += WEEK_MILLISECONDS;
         }
      }

      // Check each candidate's occurrences against each new occurrence
      for (const candidate of candidates) {
         const candidateOccurrences = generateOccurrences(
            candidate,
            conflictWindowStart,
            conflictWindowEnd
         );

         for (const newOccurrence of newOccurrences) {
            for (const existingOccurrence of candidateOccurrences) {
               if (
                  newOccurrence.startTime < existingOccurrence.endTime &&
                  existingOccurrence.startTime < newOccurrence.endTime
               ) {
                  throw new ConflictException({
                     message: 'Event conflicts with an existing event',
                     conflictingEvent: {
                        id: candidate.id,
                        title: candidate.title,
                        occurrenceStart: existingOccurrence.startTime,
                        occurrenceEnd: existingOccurrence.endTime,
                     },
                  });
               }
            }
         }
      }
   }
}

