import { ReactNode } from 'react';
import {
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ActiveFilter } from '../utils/listFilters';
import { FILTER_FIELD_SX } from '../utils/listFilters';

interface ListFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filteredCount: number;
  totalCount?: number;
  countLabel: string;
  children?: ReactNode;
  trailing?: ReactNode;
}

export function ListFiltersBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filteredCount,
  totalCount,
  countLabel,
  children,
  trailing,
}: ListFiltersBarProps) {
  const showPartial = totalCount != null && filteredCount !== totalCount;

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'flex-start' }}
        flexWrap="wrap"
        useFlexGap
      >
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ width: { xs: '100%', sm: 360, md: 400 }, flexShrink: 0 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        {children}
      </Stack>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="body2" color="text.secondary">
          {showPartial
            ? `${filteredCount} de ${totalCount} ${countLabel}`
            : `${filteredCount} ${countLabel}`}
        </Typography>
        {trailing}
      </Stack>
    </Stack>
  );
}

interface ActiveFilterSelectProps {
  value: ActiveFilter;
  onChange: (value: ActiveFilter) => void;
  label?: string;
  sx?: SxProps<Theme>;
}

export function ActiveFilterSelect({
  value,
  onChange,
  label = 'Status',
  sx,
}: ActiveFilterSelectProps) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as ActiveFilter)}
      sx={{ ...FILTER_FIELD_SX, ...sx }}
    >
      <MenuItem value="ALL">Todos</MenuItem>
      <MenuItem value="ACTIVE">Ativos</MenuItem>
      <MenuItem value="INACTIVE">Inativos</MenuItem>
    </TextField>
  );
}
