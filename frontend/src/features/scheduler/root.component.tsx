import { useCallback, useRef, useState } from 'react';
import { Typography, Snackbar, Alert, Box, type AlertColor } from '@mui/material';
import type { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';

import { CalendarComponent } from './calendar/calendar.component';
import { EventDialog } from './dialog/dialog.component';
import { TimezoneSelector } from './timezone-selector/timezone-selector.component';
import { 
  useSchedulerEvents, 
  useCreateSchedulerEvent, 
  useUpdateSchedulerEvent, 
  useQuickUpdateSchedulerEvent, 
  useDeleteSchedulerEvent 
} from './calendar/calendar.hooks';
import { DIALOG_CLOSED } from './scheduler.types';
import type { DialogState, Toast, EventFormData } from './scheduler.types';

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function RootComponent() {
  const calendarRef = useRef<FullCalendar>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dialog, setDialog] = useState<DialogState>(DIALOG_CLOSED);
  const [viewingTimezone, setViewingTimezone] = useState(BROWSER_TZ);

  const closeDialog = useCallback(() => {
    setDialog(DIALOG_CLOSED);
    calendarRef.current?.getApi().unselect();
  }, []);

  const showToast = (message: string, severity: AlertColor) => {
    setToast({ message, severity });
  };

  const { data: events = [], error } = useSchedulerEvents();

  const createMutation = useCreateSchedulerEvent(
    () => showToast('Event created', 'success'),
    (err) => showToast(`Failed to create event: ${err.message}`, 'error')
  );

  const updateMutation = useUpdateSchedulerEvent(
    () => showToast('Event updated', 'success'),
    (err) => showToast(`Failed to update event: ${err.message}`, 'error')
  );

  const quickUpdateMutation = useQuickUpdateSchedulerEvent(
    () => showToast('Event updated', 'success'),
    (err) => showToast(`Failed to update event: ${err.message}`, 'error')
  );

  const deleteMutation = useDeleteSchedulerEvent(
    () => showToast('Event deleted', 'success'),
    (err) => showToast(`Failed to delete event: ${err.message}`, 'error')
  );

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

  const handleEventClick = useCallback((info: EventClickArg) => {
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
  }, [events]);

  const handleEventDrop = useCallback((info: EventDropArg) => {
    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) return;
    quickUpdateMutation.mutate({
      id: info.event.id,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
  }, [quickUpdateMutation]);

  const handleEventResize = useCallback((info: EventResizeDoneArg) => {
    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) return;
    quickUpdateMutation.mutate({
      id: info.event.id,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
  }, [quickUpdateMutation]);

  const handleDialogSave = useCallback((data: EventFormData) => {
    if (dialog.mode === 'create') {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
    closeDialog();
  }, [dialog.mode, createMutation, updateMutation, closeDialog]);

  const handleDialogDelete = useCallback((id: string) => {
    deleteMutation.mutate(id);
    closeDialog();
  }, [deleteMutation, closeDialog]);

  const calendarEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startTime,
    end: e.endTime,
    extendedProps: { timezone: e.timezone },
  }));

  if (error) {
    return (
      <Typography color="error">
        Failed to load events: {error.message}
      </Typography>
    );
  }

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <TimezoneSelector
          value={viewingTimezone}
          onChange={setViewingTimezone}
        />
      </Box>

      <SchedulerComponent
        events={calendarEvents}
        viewingTimezone={viewingTimezone}
        onSelect={handleSelect}
        onEventClick={handleEventClick}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        calendarRef={calendarRef}
      />

      {dialog.open && (
        <EventDialog
          open={true}
          onClose={closeDialog}
          mode={dialog.mode}
          initialData={dialog.initialData}
          onSave={handleDialogSave}
          onDelete={handleDialogDelete}
        />
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            onClose={() => setToast(null)}
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
