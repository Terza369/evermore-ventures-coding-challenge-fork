import { createFileRoute } from '@tanstack/react-router';
import { RootComponent } from '../features/scheduler/root.component';

export const Route = createFileRoute('/')({
  component: RootComponent,
});
