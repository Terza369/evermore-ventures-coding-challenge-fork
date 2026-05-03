import type { SxProps, Theme } from '@mui/material';

export const getCalendarStyles = (theme: Theme): SxProps<Theme> => ({
   height: 'calc(100vh - 120px)',
   width: '100%',
   backgroundColor: theme.palette.background.paper,
   borderRadius: 2,
   boxShadow: theme.shadows[3],
   p: 3,
   '& .fc': {
      fontFamily: theme.typography.fontFamily,
      color: theme.palette.text.primary,
      '--fc-border-color': theme.palette.divider,
      '--fc-button-text-color': theme.palette.primary.contrastText,
      '--fc-button-bg-color': theme.palette.primary.main,
      '--fc-button-border-color': theme.palette.primary.main,
      '--fc-button-hover-bg-color': theme.palette.primary.dark,
      '--fc-button-hover-border-color': theme.palette.primary.dark,
      '--fc-button-active-bg-color': theme.palette.primary.dark,
      '--fc-button-active-border-color': theme.palette.primary.dark,
      '--fc-event-bg-color': theme.palette.primary.main,
      '--fc-event-border-color': theme.palette.primary.main,
      '--fc-today-bg-color': theme.palette.action.hover,
      '--fc-page-bg-color': theme.palette.background.paper,
      '--fc-neutral-bg-color': theme.palette.background.default,
      '--fc-list-event-hover-bg-color': theme.palette.action.hover,
   },
   '& .fc .fc-toolbar-title': {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: theme.palette.text.primary,
   },
   '& .fc .fc-button': {
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.875rem',
      letterSpacing: '0.02857em',
      borderRadius: 1,
      boxShadow: theme.shadows[1],
      transition: 'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1), color 250ms cubic-bezier(0.4, 0, 0.2, 1)',
   },
   '& .fc .fc-button-group > .fc-button': {
      boxShadow: 'none',
      border: `1px solid ${theme.palette.primary.dark}`,
   },
   '& .fc .fc-button-group > .fc-button:not(:last-child)': {
      borderRightColor: 'transparent',
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
   },
   '& .fc .fc-button-group > .fc-button:not(:first-child)': {
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      marginLeft: '-1px',
   },
   '& .fc .fc-button:not(:disabled):active, & .fc .fc-button:not(:disabled).fc-button-active': {
      boxShadow: theme.shadows[3],
      backgroundColor: theme.palette.primary.dark,
   },
   '& .fc .fc-button:disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      borderColor: theme.palette.action.disabledBackground,
      color: theme.palette.text.disabled,
      boxShadow: 'none',
      opacity: 0.8,
   },
   '& .fc-theme-standard td, & .fc-theme-standard th': {
      borderColor: theme.palette.divider,
   },
   '& .fc-col-header-cell-cushion': {
      padding: '12px 8px',
      color: theme.palette.text.primary,
      fontWeight: 600,
      fontSize: '0.875rem',
   },
   '& .fc-daygrid-day-number': {
      color: theme.palette.text.secondary,
      padding: '8px 12px',
      fontWeight: 500,
   },
   '& .fc .fc-timegrid-slot-label-cushion': {
      color: theme.palette.text.secondary,
      fontSize: '0.75rem',
      fontWeight: 500,
   },
   '& .fc .fc-event': {
      borderRadius: '6px',
      padding: '2px 6px',
      boxShadow: theme.shadows[2],
      border: 'none',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
         boxShadow: theme.shadows[4],
         transform: 'translateY(-1px)',
         cursor: 'pointer',
      }
   },
   '& .fc .fc-timegrid-event': {
      padding: '4px 6px',
   },
   '& .fc .fc-list-event-title': {
      color: theme.palette.text.primary,
      fontWeight: 500,
   },
   '& .fc .fc-list-event-time': {
      color: theme.palette.text.secondary,
   },
   '& .fc .fc-list-day-cushion': {
      backgroundColor: theme.palette.background.default,
   },
   '& .fc-theme-standard .fc-list': {
      borderColor: theme.palette.divider,
   }
});
