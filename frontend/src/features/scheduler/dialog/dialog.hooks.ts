import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_BASE } from '../scheduler.config';
import { toLocalInput, fromLocalInput } from './dialog.utils';

import type { EventFormData } from './dialog.types';

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
      initialData.startTime ? toLocalInput(initialData.startTime, defaultTz) : ''
   );
   const [endLocal, setEndLocal] = useState(() =>
      initialData.endTime ? toLocalInput(initialData.endTime, defaultTz) : ''
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

export function useCreateSchedulerEvent(
   onSuccessCallback?: () => void,
   onErrorCallback?: (err: Error) => void
) {
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

export function useUpdateSchedulerEvent(
   onSuccessCallback?: () => void,
   onErrorCallback?: (err: Error) => void
) {
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

export function useDeleteSchedulerEvent(
   onSuccessCallback?: () => void,
   onErrorCallback?: (err: Error) => void
) {
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
