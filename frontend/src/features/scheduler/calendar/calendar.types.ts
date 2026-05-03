import type { AlertColor } from '@mui/material';

export interface BackendEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventFormData {
  id?: string;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface Toast {
  message: string;
  severity: AlertColor;
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
