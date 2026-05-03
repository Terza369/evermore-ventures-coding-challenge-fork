import { Box } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import momentTimezonePlugin from '@fullcalendar/moment-timezone';
import type { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';

interface CalendarComponentProps {
  events: any[];
  viewingTimezone: string;
  onSelect: (info: DateSelectArg) => void;
  onEventClick: (info: EventClickArg) => void;
  onEventDrop: (info: EventDropArg) => void;
  onEventResize: (info: EventResizeDoneArg) => void;
  calendarRef: React.RefObject<FullCalendar | null>;
}

export function CalendarComponent({
  events,
  viewingTimezone,
  onSelect,
  onEventClick,
  onEventDrop,
  onEventResize,
  calendarRef,
}: CalendarComponentProps) {
  return (
    <Box sx={{ height: 'calc(100vh - 120px)', width: '100%' }}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, momentTimezonePlugin]}
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
        eventDrop={onEventDrop}
        eventResize={onEventResize}
        height="100%"
      />
    </Box>
  );
}
