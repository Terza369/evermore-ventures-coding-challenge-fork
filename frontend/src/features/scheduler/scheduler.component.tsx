import { useCallback, useRef, useState } from 'react';
import { Typography, Box } from '@mui/material';
import FullCalendar from '@fullcalendar/react';

import { CalendarComponent } from './calendar/calendar.component';
import { EventDialog } from './dialog/dialog.component';
import { TimezoneSelector } from './timezone-selector/timezone-selector.component';
import { useSchedulerEvents } from './calendar/calendar.hooks';
import { API_BASE } from './scheduler.config';
import { DIALOG_CLOSED } from './dialog/dialog.types';

import type { DialogState } from './dialog/dialog.types';
import type { DateSelectArg, EventClickArg, DatesSetArg } from '@fullcalendar/core';

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SchedulerComponent() {
   const calendarRef = useRef<FullCalendar>(null);
   const [dialog, setDialog] = useState<DialogState>(DIALOG_CLOSED);
   const [viewingTimezone, setViewingTimezone] = useState(BROWSER_TZ);
   const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);

   const closeDialog = useCallback(() => {
      setDialog(DIALOG_CLOSED);
      calendarRef.current?.getApi().unselect();
   }, []);

   const { data: events = [], error } = useSchedulerEvents(
      dateRange?.from,
      dateRange?.to
   );

   const handleDatesSet = useCallback((info: DatesSetArg) => {
      setDateRange({
         from: info.start.toISOString(),
         to: info.end.toISOString(),
      });
   }, []);

   const handleSelect = useCallback((info: DateSelectArg) => {
      setDialog({
         open: true,
         mode: 'create',
         initialData: {
            startTime: info.start.toISOString(),
            endTime: info.end.toISOString(),
            timezone: BROWSER_TZ,
         },
      });
   }, []);

   const handleEventClick = useCallback(
      async (info: EventClickArg) => {
         const event = events.find((e) => e.id === info.event.id);
         if (!event) return;

         const dbId = event.id.split('_')[0];
         const isRecurring = event.recurrenceRule != null;

         if (isRecurring) {
            // Fetch the template to get the original times, not the occurrence's times
            try {
               const res = await fetch(`${API_BASE}/${dbId}`);
               if (!res.ok) throw new Error(`${res.status}`);
               const template = await res.json();

               setDialog({
                  open: true,
                  mode: 'edit',
                  initialData: {
                     id: dbId,
                     title: template.title,
                     startTime: template.startTime,
                     endTime: template.endTime,
                     timezone: template.timezone,
                     recurrenceRule: template.recurrenceRule ?? undefined,
                     recurrenceEnd: template.recurrenceEnd ?? undefined,
                  },
               });
            } catch {
               // Silently fail — the user can try clicking again
            }
         } else {
            setDialog({
               open: true,
               mode: 'edit',
               initialData: {
                  id: dbId,
                  title: event.title,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  timezone: event.timezone,
               },
            });
         }
      },
      [events]
   );

   const calendarEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      extendedProps: {
         timezone: event.timezone,
         recurrenceRule: event.recurrenceRule,
         recurrenceEnd: event.recurrenceEnd,
      },
   }));

   if (error) {
      return <Typography color="error">Failed to load events: {error.message}</Typography>;
   }

   return (
      <>
         <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <TimezoneSelector value={viewingTimezone} onChange={setViewingTimezone} />
         </Box>

         <CalendarComponent
            events={calendarEvents}
            viewingTimezone={viewingTimezone}
            onSelect={handleSelect}
            onEventClick={handleEventClick}
            onDatesSet={handleDatesSet}
            calendarRef={calendarRef}
         />

         {dialog.open && (
            <EventDialog
               open={true}
               onClose={closeDialog}
               mode={dialog.mode}
               initialData={dialog.initialData}
            />
         )}
      </>
   );
}
