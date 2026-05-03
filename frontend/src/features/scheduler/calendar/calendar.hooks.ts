import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BackendEvent, EventFormData } from './calendar.types';

const API_BASE = 'http://localhost:3000/api/events';

export function useSchedulerEvents() {
  return useQuery<BackendEvent[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
  });
}

export function useCreateSchedulerEvent(onSuccessCallback?: () => void, onErrorCallback?: (err: Error) => void) {
  const queryClient = useQueryClient();
  
  return useMutation({
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
      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (err: Error) => {
      if (onErrorCallback) onErrorCallback(err);
    },
  });
}

export function useUpdateSchedulerEvent(onSuccessCallback?: () => void, onErrorCallback?: (err: Error) => void) {
  const queryClient = useQueryClient();
  
  return useMutation({
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
      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (err: Error) => {
      if (onErrorCallback) onErrorCallback(err);
    },
  });
}

export function useQuickUpdateSchedulerEvent(onSuccessCallback?: () => void, onErrorCallback?: (err: Error) => void) {
  const queryClient = useQueryClient();
  
  return useMutation({
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
      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (err: Error) => {
      if (onErrorCallback) onErrorCallback(err);
    },
  });
}

export function useDeleteSchedulerEvent(onSuccessCallback?: () => void, onErrorCallback?: (err: Error) => void) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (err: Error) => {
      if (onErrorCallback) onErrorCallback(err);
    },
  });
}
