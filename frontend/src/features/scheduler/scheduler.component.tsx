import { useCallback, useRef, useState } from 'react';
import { Typography, Box } from '@mui/material';
import FullCalendar from '@fullcalendar/react';

import { CalendarComponent } from './calendar/calendar.component';
import { EventDialog } from './dialog/dialog.component';
import { TimezoneSelector } from './timezone-selector/timezone-selector.component';
import { useSchedulerEvents } from './calendar/calendar.hooks';
import { DIALOG_CLOSED } from './dialog/dialog.types';

import type { DialogState } from './dialog/dialog.types';
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SchedulerComponent() {
   const calendarRef = useRef<FullCalendar>(null);
   const [dialog, setDialog] = useState<DialogState>(DIALOG_CLOSED);
   const [viewingTimezone, setViewingTimezone] = useState(BROWSER_TZ);

   const closeDialog = useCallback(() => {
      setDialog(DIALOG_CLOSED);
      calendarRef.current?.getApi().unselect();
   }, []);

   const { data: events = [], error } = useSchedulerEvents();

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
      (info: EventClickArg) => {
         const event = events.find((e) => e.id === info.event.id);
         if (!event) return;
         setDialog({
            open: true,
            mode: 'edit',
            initialData: {
               id: event.id,
               title: event.title,
               startTime: event.startTime,
               endTime: event.endTime,
               timezone: event.timezone,
            },
         });
      },
      [events]
   );

   const calendarEvents = events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.startTime,
      end: e.endTime,
      extendedProps: { timezone: e.timezone },
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
