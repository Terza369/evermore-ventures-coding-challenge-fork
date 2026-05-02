import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Autocomplete,
  Stack,
} from '@mui/material';

export interface EventFormData {
  id?: string;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData: Partial<EventFormData>;
  onSave: (data: EventFormData) => void;
  onDelete?: (id: string) => void;
}

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Converts any ISO date string (with or without offset) into a
 * "YYYY-MM-DDTHH:mm" wall-clock string for the given IANA timezone.
 * Used to pre-fill <input type="datetime-local"> fields.
 */
function toLocalInput(isoStr: string, timezone: string): string {
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  // en-GB hour "24" means midnight — normalize to "00"
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * Converts a wall-clock "YYYY-MM-DDTHH:mm" string in a given timezone
 * to a UTC ISO string.
 *
 * Strategy: create a UTC Date with the same numeric values, then use
 * Intl to find how that instant maps to the target timezone. The
 * difference tells us the timezone offset, which we apply to get the
 * correct UTC instant.
 */
function fromLocalInput(localStr: string, timezone: string): string {
  const [datePart, timePart] = localStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Guess: pretend the wall-clock values are UTC
  const guessMs = Date.UTC(year, month - 1, day, hour, minute);

  // See what wall-clock time that UTC instant maps to in the target timezone
  const rendered = toLocalInput(new Date(guessMs).toISOString(), timezone);
  const [rDatePart, rTimePart] = rendered.split('T');
  const [rY, rM, rD] = rDatePart.split('-').map(Number);
  const [rH, rMin] = rTimePart.split(':').map(Number);

  // The offset is: rendered - wanted (all in UTC arithmetic to avoid browser TZ)
  const renderedMs = Date.UTC(rY, rM - 1, rD, rH, rMin);
  const offsetMs = renderedMs - guessMs;

  // Correct the guess by subtracting the offset
  return new Date(guessMs - offsetMs).toISOString();
}

/**
 * Custom event dialog for creating and editing calendar events.
 * Includes a timezone picker for per-event timezone selection.
 */
export function EventDialog({
  open,
  onClose,
  mode,
  initialData,
  onSave,
  onDelete,
}: EventDialogProps) {
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
    // Convert displayed values: old TZ → UTC → new TZ
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {mode === 'create' ? 'Create Event' : 'Edit Event'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
              autoFocus
            />

            <TextField
              label="Start"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="End"
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Autocomplete
              value={timezone}
              onChange={(_, newValue) => {
                if (newValue) handleTimezoneChange(newValue);
              }}
              options={timezones}
              groupBy={(option) => option.split('/')[0]}
              disableClearable
              renderInput={(params) => (
                <TextField {...params} label="Event Timezone" />
              )}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {mode === 'edit' && initialData.id && onDelete && (
            <Button
              color="error"
              onClick={() => {
                onDelete(initialData.id!);
                onClose();
              }}
              sx={{ mr: 'auto' }}
            >
              Delete
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
