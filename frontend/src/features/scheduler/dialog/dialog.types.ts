export interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData: Partial<EventFormData>;
}

export interface EventFormData {
  id?: string;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface DialogState {
  open: boolean;
  mode: 'create' | 'edit';
  initialData: Partial<EventFormData>;
}

export const DIALOG_CLOSED: DialogState = {
  open: false,
  mode: 'create',
  initialData: {},
};