import { useCallback } from 'react';
import { Box, useTheme } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { type EventResizeDoneArg } from '@fullcalendar/interaction';
import momentTimezonePlugin from '@fullcalendar/moment-timezone';

import { useToast } from '../../../components/toast/toast.context';
import { useQuickUpdateSchedulerEvent } from './calendar.hooks';
import { getCalendarStyles } from './calendar.styles';
import { API_BASE } from '../scheduler.config';

import type { EventDropArg } from '@fullcalendar/core/index.js';
import type { CalendarComponentProps } from './calendar.types';

export function CalendarComponent({
   events,
   viewingTimezone,
   onSelect,
   onEventClick,
   onDatesSet,
   calendarRef,
}: CalendarComponentProps) {
   const { showToast } = useToast();
   const theme = useTheme();

   const quickUpdateMutation = useQuickUpdateSchedulerEvent(
      () => showToast('Event updated', 'success'),
      (err) => showToast(`Failed to update event: ${err.message}`, 'error')
   );

   const handleEventDrop = useCallback(
      async (info: EventDropArg) => {
         const start = info.event.start;
         const end = info.event.end;
         if (!start || !end) return;

         const id = info.event.id.split('_')[0];
         const isRecurring = info.event.extendedProps.recurrenceRule;

         try {
            if (isRecurring) {
               const oldStart = info.oldEvent.start;
               if (!oldStart) return;
               const deltaMilliseconds = start.getTime() - oldStart.getTime();

               const res = await fetch(`${API_BASE}/${id}`);
               if (!res.ok) throw new Error(`${res.status}`);
               const template = await res.json();

               await quickUpdateMutation.mutateAsync({
                  id,
                  startTime: new Date(new Date(template.startTime).getTime() + deltaMilliseconds).toISOString(),
                  endTime: new Date(new Date(template.endTime).getTime() + deltaMilliseconds).toISOString(),
               });
            } else {
               await quickUpdateMutation.mutateAsync({
                  id,
                  startTime: start.toISOString(),
                  endTime: end.toISOString(),
               });
            }
         } catch {
            info.revert();
         }
      },
      [quickUpdateMutation]
   );

   const handleEventResize = useCallback(
      async (info: EventResizeDoneArg) => {
         const start = info.event.start;
         const end = info.event.end;
         if (!start || !end) return;

         const id = info.event.id.split('_')[0];
         const isRecurring = info.event.extendedProps.recurrenceRule;

         try {
            if (isRecurring) {
               const oldEnd = info.oldEvent.end;
               if (!oldEnd) return;
               const deltaMilliseconds = end.getTime() - oldEnd.getTime();

               const res = await fetch(`${API_BASE}/${id}`);
               if (!res.ok) throw new Error(`${res.status}`);
               const template = await res.json();

               await quickUpdateMutation.mutateAsync({
                  id,
                  startTime: template.startTime,
                  endTime: new Date(new Date(template.endTime).getTime() + deltaMilliseconds).toISOString(),
               });
            } else {
               await quickUpdateMutation.mutateAsync({
                  id,
                  startTime: start.toISOString(),
                  endTime: end.toISOString(),
               });
            }
         } catch {
            info.revert();
         }
      },
      [quickUpdateMutation]
   );

   return (
      <Box sx={getCalendarStyles(theme)}>
         <FullCalendar
            ref={calendarRef}
            plugins={[
               dayGridPlugin,
               timeGridPlugin,
               listPlugin,
               interactionPlugin,
               momentTimezonePlugin,
            ]}
            initialView="timeGridWeek"
            timeZone={viewingTimezone}
            headerToolbar={{
               left: 'prev,next today',
               center: 'title',
               right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            unselectAuto={false}
            select={onSelect}
            eventClick={onEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            datesSet={onDatesSet}
            height="100%"
         />
      </Box>
   );
}
