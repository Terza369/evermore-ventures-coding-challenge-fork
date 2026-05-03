import { createFileRoute } from '@tanstack/react-router';
import { HomeComponent } from '../components/Home';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});
