import { createFileRoute } from '@tanstack/react-router';
import { SchedulerComponent } from '../features/scheduler/scheduler.component';

export const Route = createFileRoute('/')({
  component: SchedulerComponent,
});
