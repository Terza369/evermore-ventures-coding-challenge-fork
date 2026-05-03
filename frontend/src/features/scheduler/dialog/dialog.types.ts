import type { EventFormData } from '../calendar/calendar.types';

export interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData: Partial<EventFormData>;
  onSave: (data: EventFormData) => void;
  onDelete?: (id: string) => void;
}
