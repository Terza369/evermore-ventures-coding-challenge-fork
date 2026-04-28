import { Outlet } from '@tanstack/react-router';
import { Container } from '@mui/material';

export function RootLayout() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Outlet />
    </Container>
  );
}
