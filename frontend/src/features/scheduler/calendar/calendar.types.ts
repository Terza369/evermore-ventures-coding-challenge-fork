import type { DateSelectArg, EventClickArg } from '@fullcalendar/core/index.js';
import type FullCalendar from '@fullcalendar/react';

export interface BackendEvent {
   id: string;
   title: string;
   startTime: string;
   endTime: string;
   timezone: string;
   recurrenceRule: string | null;
   recurrenceEnd: string | null;
   createdAt: string;
   updatedAt: string;
}

export interface CalendarComponentProps {
   events: any[];
   viewingTimezone: string;
   onSelect: (info: DateSelectArg) => void;
   onEventClick: (info: EventClickArg) => void;
   calendarRef: React.RefObject<FullCalendar | null>;
}
