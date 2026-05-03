import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { API_BASE } from '../scheduler.config';

import type { BackendEvent } from './calendar.types';

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
