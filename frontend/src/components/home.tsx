import { useQuery } from '@tanstack/react-query';
import { Typography, Button, Box } from '@mui/material';

export function HomeComponent() {
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/events');
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
    enabled: false,
  });

  return (
    <Box>
      <Button variant="contained" onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? 'Fetching…' : 'Fetch Events'}
      </Button>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error: {error.message}
        </Typography>
      )}

      {data && (
        <Typography component="pre" sx={{ mt: 2, whiteSpace: 'pre-wrap', fontSize: 14 }}>
          {JSON.stringify(data, null, 2)}
        </Typography>
      )}
    </Box>
  );
}
