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

import {
   useEventDialog,
   useCreateSchedulerEvent,
   useUpdateSchedulerEvent,
   useDeleteSchedulerEvent,
} from './dialog.hooks';
import { useToast } from '../../../components/toast/toast.context';

import type { EventDialogProps } from './dialog.types';

export function EventDialog({ open, onClose, mode, initialData }: EventDialogProps) {
   const { showToast } = useToast();

   const handleSuccess = (msg: string) => {
      showToast(msg, 'success');
      onClose();
   };

   const handleError = (msg: string) => {
      showToast(msg, 'error');
   };

   const createMutation = useCreateSchedulerEvent(
      () => handleSuccess('Event created'),
      (err) => handleError(`Failed to create event: ${err.message}`)
   );

   const updateMutation = useUpdateSchedulerEvent(
      () => handleSuccess('Event updated'),
      (err) => handleError(`Failed to update event: ${err.message}`)
   );

   const deleteMutation = useDeleteSchedulerEvent(
      () => handleSuccess('Event deleted'),
      (err) => handleError(`Failed to delete event: ${err.message}`)
   );

   const handleSave = (data: any) => {
      if (mode === 'create') {
         createMutation.mutate(data);
      } else {
         updateMutation.mutate(data);
      }
   };

   const {
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
   } = useEventDialog(initialData, handleSave);

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <form onSubmit={handleSubmit}>
            <DialogTitle>{mode === 'create' ? 'Create Event' : 'Edit Event'}</DialogTitle>

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
                     renderInput={(params) => <TextField {...params} label="Event Timezone" />}
                  />
               </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
               {mode === 'edit' && initialData.id && (
                  <Button
                     color="error"
                     onClick={() => deleteMutation.mutate(initialData.id!)}
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
