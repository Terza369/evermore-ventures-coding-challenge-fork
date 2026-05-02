import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Snackbar, Alert, type AlertColor } from '@mui/material';
import { EventCalendar } from '@mui/x-scheduler/event-calendar';

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

const API_BASE = 'http://localhost:3000/api/events';

export function HomeComponent() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, severity: AlertColor) => {
    setToast({ message, severity });
  };

  const { data: events = [], error } = useQuery<BackendEvent[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (event: Partial<BackendEvent>) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.title || 'Untitled Event',
          startTime: event.startTime,
          endTime: event.endTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Event created', 'success');
    },
    onError: (err: Error) => showToast(`Failed to create event: ${err.message}`, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: async (event: BackendEvent) => {
      const res = await fetch(`${API_BASE}/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast('Event updated', 'success');
    },
    onError: (err: Error) => showToast(`Failed to update event: ${err.message}`, 'error'),
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
    onError: (err: Error) => showToast(`Failed to delete event: ${err.message}`, 'error'),
  });

  const handleEventsChange = useCallback(
    (updatedEvents: BackendEvent[]) => {
      const oldMap = new Map(events.map((e) => [e.id, e]));
      const newIds = new Set(updatedEvents.map((e) => e.id));

      for (const event of updatedEvents) {
        // Created: ID in new list that doesn't exist in old list
        if (!oldMap.has(event.id)) {
          createMutation.mutate(event);
          return;
        }

        // Updated: ID exists in both lists but a property changed
        const old = oldMap.get(event.id);
        if (old && (old.title !== event.title || old.startTime !== event.startTime || old.endTime !== event.endTime)) {
          updateMutation.mutate(event);
          return;
        }
      }

      // Deleted: ID in old list that is missing from new list
      for (const event of events) {
        if (!newIds.has(event.id)) {
          deleteMutation.mutate(event.id);
          return;
        }
      }
    },
    [events, createMutation, updateMutation, deleteMutation],
  );

  if (error) {
    return <Typography color="error">Failed to load events: {error.message}</Typography>;
  }

  return (
    <div style={{ height: 'calc(100vh - 64px)', width: '100%' }}>
      <EventCalendar
        events={events}
        onEventsChange={handleEventsChange}
        eventModelStructure={{
          start: {
            getter: (event: BackendEvent) => event.startTime,
            setter: (event: Partial<BackendEvent>, value: string) => ({ ...event, startTime: value } as Partial<BackendEvent>),
          },
          end: {
            getter: (event: BackendEvent) => event.endTime,
            setter: (event: Partial<BackendEvent>, value: string) => ({ ...event, endTime: value } as Partial<BackendEvent>),
          },
        }}
      />
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
    </div>
  );
}
