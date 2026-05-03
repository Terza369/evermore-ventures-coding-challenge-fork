import { useState, useMemo } from 'react';
import type { EventFormData } from '../calendar/calendar.types';
import { toLocalInput, fromLocalInput } from './date.utils';

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useEventDialog(
  initialData: Partial<EventFormData>,
  onSave: (data: EventFormData) => void
) {
  const timezones = useMemo(() => Intl.supportedValuesOf('timeZone'), []);
  const defaultTz = initialData.timezone || BROWSER_TZ;

  const [title, setTitle] = useState(initialData.title || '');
  const [timezone, setTimezone] = useState(defaultTz);
  const [startLocal, setStartLocal] = useState(() =>
    initialData.startTime ? toLocalInput(initialData.startTime, defaultTz) : '',
  );
  const [endLocal, setEndLocal] = useState(() =>
    initialData.endTime ? toLocalInput(initialData.endTime, defaultTz) : '',
  );

  const handleTimezoneChange = (newTz: string) => {
    if (startLocal) {
      const utc = fromLocalInput(startLocal, timezone);
      setStartLocal(toLocalInput(utc, newTz));
    }
    if (endLocal) {
      const utc = fromLocalInput(endLocal, timezone);
      setEndLocal(toLocalInput(utc, newTz));
    }
    setTimezone(newTz);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startLocal || !endLocal) return;

    const startUtc = fromLocalInput(startLocal, timezone);
    const endUtc = fromLocalInput(endLocal, timezone);

    onSave({
      id: initialData.id,
      title: title.trim(),
      startTime: startUtc,
      endTime: endUtc,
      timezone,
    });
  };

  return {
    timezones,
    title,
    setTitle,
    timezone,
    handleTimezoneChange,
    startLocal,
    setStartLocal,
    endLocal,
    setEndLocal,
    handleSubmit,
  };
}
