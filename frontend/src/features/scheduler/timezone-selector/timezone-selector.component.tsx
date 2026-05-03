import { Autocomplete, TextField } from '@mui/material';
import { useMemo } from 'react';

import type { TimezoneSelectorProps } from './timezone-selector.types';

/**
 * A searchable timezone dropdown using all IANA timezones.
 * Groups timezones by region (e.g., "America", "Europe").
 */
export function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
   const timezones = useMemo(() => Intl.supportedValuesOf('timeZone'), []);

   return (
      <Autocomplete
         value={value}
         onChange={(_, newValue) => {
            if (newValue) onChange(newValue);
         }}
         options={timezones}
         groupBy={(option) => option.split('/')[0]}
         size="small"
         disableClearable
         sx={{ width: 280 }}
         renderInput={(params) => (
            <TextField {...params} label="Viewing Timezone" variant="outlined" />
         )}
      />
   );
}
