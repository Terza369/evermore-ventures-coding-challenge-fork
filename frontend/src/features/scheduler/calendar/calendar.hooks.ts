import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { API_BASE } from '../scheduler.config';

import type { BackendEvent } from './calendar.types';

export function useSchedulerEvents(from?: string, to?: string) {
   return useQuery<BackendEvent[]>({
      queryKey: ['events', from, to],
      queryFn: async () => {
         const params = new URLSearchParams();
         if (from) params.set('from', from);
         if (to) params.set('to', to);
         const res = await fetch(`${API_BASE}?${params.toString()}`);
         if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
         return res.json();
      },
      enabled: !!from && !!to,
   });
}

export function useQuickUpdateSchedulerEvent(
   onSuccessCallback?: () => void,
   onErrorCallback?: (err: Error) => void
) {
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
