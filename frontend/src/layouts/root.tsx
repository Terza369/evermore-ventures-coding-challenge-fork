import { Outlet } from '@tanstack/react-router';
import { Container } from '@mui/material';

export function RootLayout() {
  return (
    <Container maxWidth={false} sx={{ py: 4, width: '90%' }}>
      <Outlet />
    </Container>
  );
}
