import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { matchFields } from '../utils/listFilters';
import { feedbackApi } from '../api/feedback';
import type { FeedbackReport, FeedbackType } from '../types';
import { fontSizes } from '../theme/fontSizes';

type TypeFilter = 'ALL' | FeedbackType;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function FeedbackReports() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['feedback-reports'],
    queryFn: () => feedbackApi.list(),
  });

  const filtered = useMemo(
    () =>
      reports.filter((report) => {
        if (typeFilter !== 'ALL' && report.type !== typeFilter) return false;
        return matchFields(
          search,
          report.title,
          report.description,
          report.user?.name,
          report.user?.email,
          report.pageUrl,
        );
      }),
    [reports, search, typeFilter],
  );

  const columns = useMemo<GridColDef<FeedbackReport>[]>(
    () => [
      {
        field: 'type',
        headerName: 'Tipo',
        width: 140,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value === 'BUG' ? 'Bug' : 'Sugestão'}
            color={params.value === 'BUG' ? 'error' : 'primary'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'title',
        headerName: 'Título',
        flex: 1.2,
        minWidth: 200,
      },
      {
        field: 'user',
        headerName: 'Autor',
        flex: 0.8,
        minWidth: 160,
        valueGetter: (params) => params.row.user?.name ?? '—',
      },
      {
        field: 'pageUrl',
        headerName: 'Página',
        flex: 0.7,
        minWidth: 120,
        valueGetter: (params) => params.row.pageUrl ?? '—',
      },
      {
        field: 'createdAt',
        headerName: 'Enviado em',
        width: 160,
        valueFormatter: (params) => formatDateTime(String(params.value)),
      },
      {
        field: 'description',
        headerName: 'Descrição',
        flex: 1.4,
        minWidth: 220,
        renderCell: (params) => (
          <Typography
            noWrap
            title={String(params.value)}
            sx={{ fontSize: fontSizes.sm, color: 'text.secondary' }}
          >
            {String(params.value)}
          </Typography>
        ),
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Feedback"
        subtitle="Bugs e sugestões enviados pela equipe"
      />

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por título, descrição ou autor"
          filteredCount={filtered.length}
          totalCount={reports.length}
          countLabel={filtered.length === 1 ? 'report' : 'reports'}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={typeFilter}
            onChange={(_, value: TypeFilter | null) => {
              if (value) setTypeFilter(value);
            }}
          >
            <ToggleButton value="ALL">Todos</ToggleButton>
            <ToggleButton value="SUGGESTION">Sugestões</ToggleButton>
            <ToggleButton value="BUG">Bugs</ToggleButton>
          </ToggleButtonGroup>
        </ListFiltersBar>

        <AppDataGrid
          rows={filtered}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              reports.length === 0
                ? 'Nenhum feedback enviado ainda'
                : 'Nenhum feedback encontrado com os filtros',
            footerRowSelected: (count) => `${count} selecionado(s)`,
          }}
        />
      </Card>
    </Box>
  );
}
