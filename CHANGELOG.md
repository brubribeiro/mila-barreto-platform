# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- Pacientes: lista Aurora com cards de estatísticas (`GET /patients/stats`), score de confiabilidade, última visita, total gasto e paginação.
- Ficha do paciente redesenhada (abas Geral, Agendamentos, Pacotes, Anamnese, Fotos).
- Fotos **antes/depois** por paciente vinculadas a agendamento (`PatientPhoto`, upload R2 comprimido).
- `AppointmentDialogProvider` para abrir modal de agendamento globalmente (Layout, ficha, drawer).
- Componente compartilhado `LabeledField` (padrão Aurora).
- Backend: `getBrazilWallClock` para validação de expediente em `America/Sao_Paulo`.
- Agenda: badge **Sessão X/Y** em eventos vinculados a pacote; API retorna `sessionIndex` por agendamento.
- Formulário de agendamento: resumo do paciente (popover), modal de sessões do pacote, agendamento em lote das sessões faltantes.
- Conclusão de agendamento: campo **mês de referência** (`referenceMonth`) para competência financeira de atendimentos passados.
- Backend: `resolveRevenuePaidAt` projeta `paidAt` da receita conforme mês de referência.
- Seed: notas clínicas demo (`demo-appointment-notes.ts`), agendamentos de sexta/sábado, script `prisma:seed-package-appointments`.
- Tema: scrollbar global via `MuiCssBaseline`; estilos refinados em `MuiOutlinedInput` e `MuiSelect`.
- Procedimentos: campo **categoria**, flag **applicationMap**, vínculo `ProcedureEquipment` com custo por uso; migrations Prisma.
- Procedimentos: lista Aurora com filtro por categoria, paginação e colunas financeiras (margem, custos).
- Componente compartilhado `FormSection` para seções de modais.
- Pacotes: campo **highlight** (Mais vendido / Recorrente), `GET /packages/stats/summary`, agregações na listagem (preço, economia, pacientes ativos).
- Promoções: tipo de desconto **COMBO** no enum Prisma; migration `20260730140000_promotion_combo_discount_type`.
- Hook `useUrlState` / `useUrlGridState` (`frontend/src/hooks/useUrlState.ts`): busca, filtros, ordenação e página das listas na query string (`history.replace`, valores padrão omitidos). Aplicado em Pacientes (mantém `?ficha=`), Financeiro, Estoque, Documentos, Agenda (`visao`, `data`, `profissionais`), Procedimentos, Pacotes, Promoções, Equipamentos, Usuários, Auditoria, Despesas recorrentes e Mensagens.

### Changed

- `Patients.tsx`: substitui DataGrid por lista customizada Aurora.
- `PatientDetail.tsx`, `PatientDetailDrawer`, `PatientFormDialog`: alinhados ao visual Aurora.
- `AnamnesisFormDialog` / `AnamnesisView`: seções em cards, campos com `LabeledField`.
- `AppointmentFormDialog`: suporte a `defaultPatientId`; busca de profissionais só após init do form; redesign Aurora (seções, modais de pagamento e confirmação).
- Agenda: skeleton de carregamento no calendário; remoção de scrollbar customizada local (usa tema global).
- Dashboard: semana da agenda = 7 dias a partir do anchor (não mais segunda–domingo fixos).
- `UpcomingExpensesCard`: skeleton no lugar de texto "Carregando...".
- `DialogCloseButton`: bordas arredondadas, rodapé cinza claro, botão fechar estilizado.
- `Procedures.tsx`: substitui DataGrid por lista customizada Aurora; `ProcedureFormDialog` com equipamentos e categoria.
- Modais de cadastro: adotam `FormSection` (paciente, financeiro, estoque, pacotes, profissionais, roles, etc.).
- `Layout`: botão **Novo agendamento** outlined; sino de notificações reposicionado.
- Dashboard: scroll na lista de aniversariantes; botão WhatsApp desabilitado sem telefone.
- `Packages.tsx`: substitui DataGrid por cards Aurora; `PackageFormDialog` reorganizada.
- `Promotions.tsx`: substitui DataGrid por cards Aurora; `PromotionFormDialog` com tipo Combo e escopo (procedimentos/pacotes).

### Fixed

- Disponibilidade: dia/hora do expediente extraídos no fuso do Brasil, não UTC do servidor.
- Formulário de agendamento: elimina requisição extra de profissionais disponíveis ao abrir.

## [0.2.0] - 2026-07-15

### Added

- Componente `AuroraIcon` com ícones de traço no estilo do protótipo Aurora (sidebar e notificações).
- Sidebar reorganizada em grupos (Principal, Catálogo, Financeiro, Equipe, Configurações) com rótulos de seção.

### Changed

- Redesign visual **Aurora**: paleta verde-água, tipografia Plus Jakarta Sans, cards e botões com bordas mais arredondadas.
- Menu lateral escuro com destaque ativo em verde; barra superior e sino de notificações alinhados ao novo visual.
- `PageHeader` oculta título/subtítulo por padrão (prop `showTitle` para telas que precisam exibir).

## [0.1.6] - 2026-06-09

### Added

- Agenda: alerta de **pendências** — agendamentos passados ainda sem conclusão, com lista expansível e acesso rápido ao formulário.
- Endpoint `GET /api/appointments/pending` com filtro por profissional quando aplicável.
- Anamnese: seção **Medidas corporais** (peso e altura) com cálculo automático de **IMC** e classificação.
- Estados de carregamento (skeletons/spinner) no dashboard, financeiro, agenda, indisponibilidades e despesas recorrentes.
- Histórico de auditoria: rótulos em português para enums (status, tipo, canal, etc.) e nomes legíveis de relações (paciente, procedimento, etc.).

### Fixed

- Notificações: rotas `read-all` e `:id/read` reordenadas para evitar conflito de roteamento no NestJS.
- Ficha do paciente: campos pessoais vazios (ex.: CPF) deixam de aparecer na visualização.
- Toast de feedback ao marcar todas as notificações como lidas.

### Changed

- Serviços de auditoria passam a incluir relações Prisma ao registrar alterações, exibindo nomes em vez de IDs.

### Security

- Migration habilitando Row-Level Security (RLS) em todas as tabelas do Postgres.

## [0.1.5] - 2026-06-08

### Fixed

- Modal de agendamento: botão **Salvar** deixa de ficar desabilitado ao selecionar procedimento enquanto a disponibilidade é atualizada em segundo plano.
- Modal de agendamento: profissional escolhido manualmente não é mais substituído ao alterar data, horário ou procedimento.
- Verificação de conflito de horário ignora estado obsoleto durante refetch da lista de profissionais disponíveis.

### Changed

- Remoção de comentários redundantes no código (frontend e backend).

## [0.1.4] - 2026-06-08

### Added

- Sistema global de **toasts** (sucesso, erro, info) no painel; feedback ao salvar, excluir e em ações rápidas em formulários e listagens.
- Keep-alive do banco em horário comercial (7h–21h) para reduzir cold start do Neon em produção.
- Templates `.env.local.example` e `.env.production.example` para separar config local (Docker Postgres) de produção.

### Fixed

- Exclusão de agendamento com atualização otimista: modal fecha na hora e evento some do calendário sem esperar o refetch.
- Modal de confirmação de exclusão: header original, mensagem contextual (paciente e horário) e espaçamento do corpo.
- Transações Prisma com retry automático em conexões pooled (Neon), reduzindo falhas intermitentes em procedimentos, estoque e pacotes.
- Backend carrega `.env.local` com prioridade sobre `.env` no desenvolvimento local.

## [0.1.3] - 2026-06-11

### Fixed

- Agendamento de **procedimento** retornava erro 500 em produção (Render + Neon pooler); API passa a usar conexão direta ao Postgres para transações com dedução de estoque.
- Validação de paciente, profissional, procedimento e pacote antes de criar agendamento; erros de referência inválida retornam 400 em vez de 500.
- Modal de agendamento: payload sanitizado, mensagens de erro da API mais claras, limpeza de `procedureId` obsoleto ao trocar tipo de atendimento.
- Filtro global de exceções Prisma com mensagens legíveis (FK, conflito de transação, etc.).
- Build no Render: `prisma migrate deploy` no pipeline de deploy.

## [0.1.2] - 2026-06-09

### Fixed

- Toggle de preferências de notificação responde na hora (atualização otimista, sem esperar a API).

### Added

- Notas de release para usuários em `RELEASE_NOTES.md`.

## [0.1.1] - 2026-06-09

### Fixed

- Logout e redirect de sessão expirada passam a respeitar o base path `/painel`.
- Modais de formulário com scroll em monitores de altura reduzida (conteúdo não fica mais cortado).
- Rewrites no Vercel para rotas SPA sob `/painel` (refresh e links diretos deixam de retornar 404).

## [0.1.0] - 2026-06-08

### Added

- Versionamento centralizado via arquivo `VERSION` na raiz do repositório.
- Exibição da versão no painel (menu lateral e login).
- Endpoint público `GET /api/health` com versão da API.
