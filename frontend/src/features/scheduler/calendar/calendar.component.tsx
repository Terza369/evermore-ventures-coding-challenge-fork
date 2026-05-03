import { useCallback } from 'react';
import { Box } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { type EventResizeDoneArg } from '@fullcalendar/interaction';
import momentTimezonePlugin from '@fullcalendar/moment-timezone';

import { useToast } from '../../../components/toast/toast.context';
import { useQuickUpdateSchedulerEvent } from './calendar.hooks';

import type { EventDropArg } from '@fullcalendar/core/index.js';
import type { CalendarComponentProps } from './calendar.types';

export function CalendarComponent({
   events,
   viewingTimezone,
   onSelect,
   onEventClick,
   calendarRef,
}: CalendarComponentProps) {
   const { showToast } = useToast();

   const quickUpdateMutation = useQuickUpdateSchedulerEvent(
      () => showToast('Event updated', 'success'),
      (err) => showToast(`Failed to update event: ${err.message}`, 'error')
   );

   const handleEventDrop = useCallback(
      (info: EventDropArg) => {
         const start = info.event.start;
         const end = info.event.end;
         if (!start || !end) return;
         quickUpdateMutation.mutate({
            id: info.event.id,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
         });
      },
      [quickUpdateMutation]
   );

   const handleEventResize = useCallback(
      (info: EventResizeDoneArg) => {
         const start = info.event.start;
         const end = info.event.end;
         if (!start || !end) return;
         quickUpdateMutation.mutate({
            id: info.event.id,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
         });
      },
      [quickUpdateMutation]
   );

   return (
      <Box sx={{ height: 'calc(100vh - 120px)', width: '100%' }}>
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
            height="100%"
         />
      </Box>
   );
}
