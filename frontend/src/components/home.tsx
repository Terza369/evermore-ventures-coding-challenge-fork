import { useQuery } from '@tanstack/react-query';
import { Typography, Box } from '@mui/material';
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

export function HomeComponent() {
  const { data: events = [], error } = useQuery<BackendEvent[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/events');
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
  });

  if (error) {
    return <Typography color="error">Failed to load events: {error.message}</Typography>;
  }

  return (
    <div style={{ height: 'calc(100vh - 64px)', width: '100%' }}>
      <EventCalendar
        events={events}
        eventModelStructure={{
          start: {
            getter: (event) => event.startTime,
            setter: (event, value) => ({ ...event, startTime: value }),
          },
          end: {
            getter: (event) => event.endTime,
            setter: (event, value) => ({ ...event, endTime: value }),
          },
        }}
      />
    </div>
  );
}

