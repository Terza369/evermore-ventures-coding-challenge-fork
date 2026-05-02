import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Snackbar, Alert, Box, type AlertColor } from '@mui/material';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import momentTimezonePlugin from '@fullcalendar/moment-timezone';
import type { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';

import { EventDialog, type EventFormData } from './EventDialog';
import { TimezoneSelector } from './TimezoneSelector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackendEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

interface Toast {
  message: string;
  severity: AlertColor;
}

interface DialogState {
  open: boolean;
  mode: 'create' | 'edit';
  initialData: Partial<EventFormData>;
}

const DIALOG_CLOSED: DialogState = {
  open: false,
  mode: 'create',
  initialData: {},
};

const API_BASE = 'http://localhost:3000/api/events';
const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomeComponent() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<Toast | null>(null);
  const [dialog, setDialog] = useState<DialogState>(DIALOG_CLOSED);
  const [viewingTimezone, setViewingTimezone] = useState(BROWSER_TZ);

  const showToast = (message: string, severity: AlertColor) => {
    setToast({ message, severity });
  };

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  const { data: events = [], error } = useQuery<BackendEvent[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
  });

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          timezone: data.timezone,
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Event created', 'success');
    },
    onError: (err: Error) =>
      showToast(`Failed to create event: ${err.message}`, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const res = await fetch(`${API_BASE}/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
          timezone: data.timezone,
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Event updated', 'success');
    },
    onError: (err: Error) =>
      showToast(`Failed to update event: ${err.message}`, 'error'),
  });

  const quickUpdateMutation = useMutation({
    mutationFn: async ({
      id,
      startTime,
      endTime,
    }: {
      id: string;
      startTime: string;
      endTime: string;
    }) => {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime, endTime }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Event updated', 'success');
    },
    onError: (err: Error) =>
      showToast(`Failed to update event: ${err.message}`, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Event deleted', 'success');
    },
    onError: (err: Error) =>
      showToast(`Failed to delete event: ${err.message}`, 'error'),
  });

  // -----------------------------------------------------------------------
  // FullCalendar callbacks
  // -----------------------------------------------------------------------

  /** User selects a time range → open create dialog */
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

  /** User clicks an existing event → open edit dialog */
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
    [events],
  );

  /** User drags an event to a new time */
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
    [quickUpdateMutation],
  );

  /** User resizes an event */
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
    [quickUpdateMutation],
  );

  // -----------------------------------------------------------------------
  // Dialog handlers
  // -----------------------------------------------------------------------

  const handleDialogSave = useCallback(
    (data: EventFormData) => {
      if (dialog.mode === 'create') {
        createMutation.mutate(data);
      } else {
        updateMutation.mutate(data);
      }
      setDialog(DIALOG_CLOSED);
    },
    [dialog.mode, createMutation, updateMutation],
  );

  const handleDialogDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
      setDialog(DIALOG_CLOSED);
    },
    [deleteMutation],
  );

  // -----------------------------------------------------------------------
  // Transform backend events → FullCalendar format
  // -----------------------------------------------------------------------

  const calendarEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startTime,
    end: e.endTime,
    extendedProps: { timezone: e.timezone },
  }));

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

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

      <Box sx={{ height: 'calc(100vh - 120px)', width: '100%' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, momentTimezonePlugin]}
          initialView="timeGridWeek"
          timeZone={viewingTimezone}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          events={calendarEvents}
          editable={true}
          selectable={true}
          selectMirror={true}
          select={handleSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="100%"
        />
      </Box>

      {dialog.open && (
        <EventDialog
          open={true}
          onClose={() => setDialog(DIALOG_CLOSED)}
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
