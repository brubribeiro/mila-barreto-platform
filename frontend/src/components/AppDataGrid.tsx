import { Box, useMediaQuery, useTheme } from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { DataGrid, type DataGridProps } from '@mui/x-data-grid';

export const appDataGridSx: SxProps<Theme> = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
  overflow: 'hidden',
  fontSize: '0.875rem',

  '& .MuiDataGrid-columnHeaders': {
    bgcolor: 'grey.50',
    borderBottom: '1px solid',
    borderColor: 'divider',
    minHeight: '48px !important',
  },
  '& .MuiDataGrid-columnHeader': {
    '&:focus, &:focus-within': { outline: 'none' },
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
    fontSize: '0.75rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'text.secondary',
  },
  '& .MuiDataGrid-row': {
    transition: 'background-color 0.15s ease',
    '&:nth-of-type(even)': {
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.025),
    },
    '&:hover': {
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.07),
    },
    '&.Mui-selected': {
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
      '&:hover': {
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
      },
    },
  },
  '& .MuiDataGrid-cell': {
    borderBottom: '1px solid',
    borderColor: 'grey.100',
    py: 1.35,
    display: 'flex',
    alignItems: 'center',
    '&:focus, &:focus-within': { outline: 'none' },
  },
  '& .MuiDataGrid-cell[data-field="name"]': {
    fontWeight: 500,
    color: 'text.primary',
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: '1px solid',
    borderColor: 'divider',
    bgcolor: 'grey.50',
    minHeight: 52,
  },
  '& .MuiTablePagination-root': {
    color: 'text.secondary',
  },
  '& .MuiDataGrid-overlayWrapper': {
    minHeight: 160,
  },
  '& .MuiDataGrid-overlay': {
    bgcolor: 'background.paper',
    fontSize: '0.875rem',
    color: 'text.secondary',
  },
  '& .MuiDataGrid-actionsCell': {
    gap: 0.5,
  },
  '& .MuiDataGrid-actionsCell .MuiIconButton-root': {
    color: 'text.secondary',
    borderRadius: 1.5,
    '&:hover': {
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
      color: 'primary.dark',
    },
  },
};

type AppDataGridProps = DataGridProps & {
  height?: number | string;
};

const EMPTY_GRID_SX: SxProps<Theme> = {
  '& .MuiDataGrid-overlayWrapper': {
    minHeight: 100,
  },
  '& .MuiDataGrid-virtualScroller': {
    overflow: 'hidden !important',
  },
};

export function AppDataGrid({ height = 560, sx, rows, loading, ...props }: AppDataGridProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const rowCount = (rows ?? []).length;
  const isEmpty = rowCount === 0 && !loading;
  const isLoadingEmpty = rowCount === 0 && !!loading;

  const responsiveHeight = isMobile ? 420 : height;
  const loadingEmptyHeight = isMobile ? 280 : 320;

  const mergedSx = [
    appDataGridSx,
    isEmpty && EMPTY_GRID_SX,
    ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
  ];

  return (
    <Box
      sx={{
        width: '100%',
        ...(isEmpty
          ? {}
          : { height: isLoadingEmpty ? loadingEmptyHeight : responsiveHeight }),
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        '& .MuiDataGrid-root': {
          minWidth: isMobile && rowCount > 0 ? 640 : 'auto',
        },
      }}
    >
      <DataGrid
        disableRowSelectionOnClick
        pageSizeOptions={isMobile ? [10, 25] : [10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        rows={rows}
        loading={loading}
        autoHeight={isEmpty}
        {...props}
        sx={mergedSx}
      />
    </Box>
  );
}
