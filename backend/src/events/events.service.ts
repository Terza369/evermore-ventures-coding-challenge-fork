import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService, Prisma } from '../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto, FindEventsDto } from './dto';
import { validateTimeRange, validateTimezone } from './events.utils';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(input: FindEventsDto) {
    const where: Prisma.EventWhereInput = {};

    if (input.from || input.to) {
      where.startTime = {};
      where.endTime = {};

      if (input.from) {
        // Events that end after the range start
        where.endTime = { gt: new Date(input.from) };
      }
      if (input.to) {
        // Events that start before the range end
        where.startTime = { lt: new Date(input.to) };
      }
    }

    return this.prisma.event.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
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

    validateTimeRange(startTime, endTime);
    validateTimezone(input.timezone);
    await this.checkForConflicts(startTime, endTime);

    return this.prisma.event.create({
      data: {
        title: input.title,
        startTime,
        endTime,
        timezone: input.timezone,
      },
    });
  }

  async update(id: string, input: UpdateEventDto) {
    const existing = await this.findOne(id);

    const startTime = input.startTime
      ? new Date(input.startTime)
      : existing.startTime;
    const endTime = input.endTime ? new Date(input.endTime) : existing.endTime;

    validateTimeRange(startTime, endTime);
    if (input.timezone) {
      validateTimezone(input.timezone);
    }

    await this.checkForConflicts(startTime, endTime, id);

    return this.prisma.event.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.startTime !== undefined && { startTime }),
        ...(input.endTime !== undefined && { endTime }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
      },
    });
  }

  async delete(id: string) {
    // Ensure the event exists
    await this.findOne(id);

    return this.prisma.event.delete({ where: { id } });
  }

  /**
   * Checks for overlapping events in UTC.
   * Two intervals [A_start, A_end) and [B_start, B_end) overlap iff:
   *   A_start < B_end AND B_start < A_end
   *
   * Touching events (e.g., 10:00–11:00 and 11:00–12:00) are NOT conflicts.
   *
   * @param excludeId - Event ID to exclude from the check (used during updates)
   */
  private async checkForConflicts(
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ) {
    const conflicting = await this.prisma.event.findFirst({
      where: {
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true, title: true, startTime: true, endTime: true },
    });

    if (conflicting) {
      throw new ConflictException({
        message: 'Event conflicts with an existing event',
        conflictingEvent: conflicting,
      });
    }
  }
}
