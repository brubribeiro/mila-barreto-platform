# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- Header Aurora: "Novo agendamento" preenchido, relógio global de histórico (`AuditHistoryDialog` pela rota, substitui os 16 botões por tela) e olho para ocultar valores (`utils/money.ts`).
- `AuditHistoryDialog` no padrão Aurora: tabela em grid e select de ação/período no estilo das listas (Usuários), paginação própria no rodapé, no lugar do DataGrid; relógio do header fica desabilitado nas telas sem histórico.
- Modo escuro Aurora: `createAppTheme(mode)` em `theme/`, `ColorModeContext` (lua do header, salvo em `localStorage` `mila.colorMode`, 1ª visita segue `prefers-color-scheme`); paleta escura derivada do verde-água, escala de cinza invertida, FullCalendar/WhatsApp/badges com tokens do tema; botões do header 34px no mobile.
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
- Grupos: campo `color` em `Role` (migration `20261012120000_role_color`, `#RRGGBB` validado no DTO, cores padrão no seed).
- Mensagens: enum Prisma `MessageTrigger` e campos `trigger`/`active` em `MessageTemplate` (migration `20261012120000_message_template_trigger`, que deriva o gatilho da categoria dos modelos existentes); DTOs aceitam `trigger`, `active` e `category: null`; seed com modelos Lembrete 24h e Pós-procedimento.
- Frontend: tela Mensagens no layout Aurora (lista de modelos + detalhe com prévia do WhatsApp), modal `MessageTemplateFormDialog` com gatilho e status, `VariableChip`; variável `{nome}` (alias de `{paciente_nome}`, que segue aceita); `SendWhatsAppDialog` lista só modelos ativos e sugere pelo gatilho.
- Metas: modelo Prisma `Goal` (enums `GoalMetric`, `GoalFormat`, `GoalPeriodType`), migration `20261011120000_goals`, módulo `goals/` com CRUD, `GET /goals?scope=current|upcoming|past|all&at=` e `GET /goals/preview`; valor atual calculado (faturamento, novos pacientes, procedimentos, ticket médio, ocupação da agenda, taxa de retorno) ou manual; permissões `goals:*`.
- Frontend: página `/metas` (`Goals.tsx`, `GoalFormDialog`, `goalUtils`) no menu Análise; card `GoalsCard` no Dashboard com metas reais.
- Pendências: modelo Prisma `PendingTask` (enums `PendingRule`, `PendingCategory`), migration `20261013120000_pendencias` (também concede `pendencias:*` aos grupos de sistema Recepção e Profissional), módulo `pendencias/` com `GET /pendencias`, `GET /pendencias/resolved`, `GET|PUT /pendencias/rules`, `POST /pendencias/resolve`, `POST /pendencias/assign`, `POST /pendencias/:id/reopen` e CRUD de pendências manuais; permissões `pendencias:*` e auditoria (`PendingTask`, `PendingRules`).
- Pendências geradas por regras a cada consulta (estoque abaixo do mínimo, validade próxima, contas a vencer, agendamento sem desfecho, manutenção de equipamento, documento sem assinatura, data comemorativa sem promoção), com parâmetros e responsável padrão em `app_settings.pending_rules`; resolução e responsável das geradas persistidos em `PendingTask.sourceKey`. Utilitário `common/utils/commemorative-dates.util.ts`. `AppointmentsModule` e `FinanceModule` passam a exportar seus serviços.
- Frontend: página `/pendencias` (`Pendencias.tsx`, `PendingRulesDialog`, `PendingTaskDialog`, `pendenciasUtils`) no menu Principal, com Foco de hoje, abas Urgentes/Atrasadas/Próximas, Resolvidas, filtro por categoria, rosca por categoria, ações rápidas e relatório CSV.
- Rotinas de skincare (anamnese de pele): modelos Prisma `SkincareProduct`, `SkincareRule` e `SkincareRoutine` (FK para `Patient`, cascade), migration `20261020120000_skincare_routines` (também concede `routines:view|create|edit` ao Profissional e `routines:view` à Recepção), módulo `skincare/` com CRUD de `/skincare/products`, `/skincare/rules` e `/skincare/routines` (`GET ?patientId=`); excluir produto o retira das regras; permissões `routines:*` e auditoria (`SkincareProduct`, `SkincareRule`, `SkincareRoutine`). A rotina salva guarda as respostas e uma cópia dos produtos (nome, marca, ativo, modo de uso), para o histórico não mudar quando o catálogo muda.
- Seed: catálogo inicial da anamnese de pele (`prisma/skincare-demo-data.ts`, 20 produtos e 15 regras do protótipo), criado só quando não há produtos.
- Frontend: página `/rotinas` (`SkincareRoutines.tsx`, `SkincareProductDialog`, `SkincareRuleDialog`) no menu Catálogo; assistente `SkinAnamnesisWizard` (6 etapas, rotina Manhã/Noite/Semanal gerada por `generateRoutine` em `skincareUtils`, edição, impressão, envio por WhatsApp/e-mail via `SendRoutineDialog`) aberto em `SkinAnamnesisDialog` pelo card `PatientSkinRoutinesCard` (aba Anamnese da ficha) e pelo atalho no modal de agendamento em edição.

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
- Backend (refactor, sem mudança de API/comportamento): `AppointmentsService` dividido em `AppointmentRulesService` (referências, disponibilidade, intervalo de retorno), `AppointmentMaterialsService` (baixa/devolução de estoque), `AppointmentFinanceService` (receita, custo de materiais, backfill) e `AppointmentEventsService` (notificações/auditoria), mais `appointment.helpers.ts`; regra de receita de pacote unificada entre conclusão e backfill; removido cálculo morto de `costDetails` e consultas duplicadas em `update`.
- Backend (refactor, sem mudança de API/comportamento): `PatientsService` dividido em `PatientPhotoStorageService` (R2, validação e URLs assinadas), `PatientStatsService` (agregações e confiabilidade), `PatientEventsService` (auditoria/notificação) e `patient-fields.util.ts` (normalização de campos com regra única para nulos/trim).
- Testes: spec de pacientes passa a prover `CompressionService` e mock de `financialEntry` (12 testes que falhavam na montagem do módulo voltam a passar).
- `Metrics.tsx`: redesign Aurora sem Recharts (barras, divisão proporcional e donut em MUI); KPIs de topo (receita de procedimentos, ticket médio, taxa de retorno, no-show) com delta vs. período anterior de mesma duração (segunda chamada a `GET /metrics`); abas em pílulas; indicadores por aba em faixa única; aba Financeiro com resumo de receitas/despesas/saldo e receita por categoria.
- `PaymentMethods.tsx`: substitui DataGrid por grade de cards Aurora (taxa, valor líquido a cada R$ 100, uso em lançamentos); `PaymentMethodFormDialog` com `FormSection`/`LabeledField` e status em select.
- `RecurringExpenses.tsx`: substitui DataGrid por layout Aurora (cards de resumo com divisão fixo/variável e vencimentos em 7 dias, painel de custo por hora minimizável, tabela paginada com próximo vencimento); `RecurringExpenseFormDialog` em coluna única com `LabeledField`. API e cálculo de custo/hora inalterados.
- `Roles.tsx`: substitui DataGrid por layout Aurora (cards de grupo + matriz de permissões editável na página, com salvar/descartar); `RoleFormDialog` em coluna única (520px) com cor do grupo e "Copiar permissões de".
- Documentos: status `DocumentStatus` (`PENDING`/`SENT`/`SIGNED`, com `signedAt`), texto gerado (`content`) e vínculo opcional a modelo; novo model `DocumentTemplate` (`document_templates`). Migration `20261011120000_document_status_templates` marca os documentos existentes como `SIGNED`.
- Backend Documentos: `POST /documents/from-template` (preenche `{{paciente}}`, `{{cpf}}`, `{{nascimento}}`, `{{telefone}}`, `{{email}}`, `{{endereco}}`, `{{data}}`, `{{profissional}}`), `GET /documents/:id`, `PATCH /documents/:id`, `POST /documents/:id/file` (anexa a versão assinada no R2 e marca `SIGNED`); upload aceita `status`. Listagem devolve `hasContent` sem o texto.
- Backend: CRUD `/document-templates` (permissões `documents:*`, auditoria `DocumentTemplate`); seed com 3 modelos padrão (consentimento, anamnese, autorização de imagem).
- `Documents.tsx`: layout Aurora com cards Total/Assinados/Pendentes/Modelos ativos, tabela paginada (documento, paciente, tipo, data, status) e menu por linha (abrir, visualizar/imprimir, anexar versão assinada, marcar status, editar, excluir); filtros de status/tipo/vínculo. `DocumentFormDialog` (substitui `DocumentUploadDialog`: modelo ou arquivo, status, observações, edição), `DocumentViewerDialog` (texto + impressão) e `DocumentTemplatesDialog` (CRUD de modelos com inserção de campos); remove `DocumentCard`.
- `Equipment.tsx`: substitui DataGrid por cards Aurora (stats, ciclo de manutenção, paginação); `EquipmentFormDialog` em coluna única com `LabeledField`.
- `PrivacyPolicy.tsx`: layout Aurora (cabeçalho fixo com marca e botão "Voltar ao login", selo "Documento legal", conteúdo em card branco e rodapé com link para os Termos de Uso), responsivo; texto legal e rota `/privacidade` inalterados.
- `Login.tsx`: layout Aurora (painel de marca verde-escuro com gradiente e orbes animados, painel claro com botão “Entrar com o Google”, caixa de acesso exclusivo, contato do administrador e links de Termos/Privacidade); o botão oficial do `GoogleLogin` fica invisível sobre o botão visual, mantendo o fluxo de ID token; painel de marca some abaixo de `md`. Novo ícone `lock` em `AuroraIcon`, token `fontSizes['8xl']` (38px) e variável opcional `VITE_ADMIN_CONTACT_EMAIL` (link `mailto:` de “Fale com o administrador”).
- `TermsOfUse.tsx`: layout Aurora (cabeçalho fixo com marca e botão Voltar ao login, selo Documento legal, seções em card único, rodapé com link para `/privacidade`); texto legal e rota `/termos` inalterados.
- Layout: rotas autenticadas envolvidas por `PAGE_SHELL_SX` (`theme/layout.ts`, largura total sem `maxWidth` centralizado); `PAGE_MAX_WIDTH` mantido só para scroll horizontal de grades (procedimentos); removidos limites locais em rotinas, detalhe de estoque e páginas legais.

### Fixed

- Disponibilidade: dia/hora do expediente extraídos no fuso do Brasil, não UTC do servidor.
- Formulário de agendamento: elimina requisição extra de profissionais disponíveis ao abrir.
- Telas Usuários, Horários, Estoque, Financeiro, Metas, Documentos, Formas de pagamento, Mensagens, Grupos e permissões e Relatórios voltam a ocupar a largura total (removido `maxWidth: 1320` centralizado no wrapper raiz).
- Dashboard: card **Metas do mês** alinhado ao card da Agenda (espaçamento do cabeçalho, estado vazio em largura total e botão "Definir metas" dentro da caixa vazia).
- Horários: cabeçalhos dos cards **Disponibilidade da equipe** e **Bloqueios de agenda** com a mesma altura (`minHeight` no `CARD_HEADER_SX`), divisores alinhados.
- Contraste: textos auxiliares abaixo do valor principal (`60h por semana` em Horários e linhas equivalentes em Mensagens, Documentos, Formas de pagamento, Metas, Pendências, Grupos, Despesas recorrentes e nota de Usuários) passam de `text.disabled` para `text.secondary`; os de 11px sobem para 12px.
- Procedimentos: filtro de categoria passa de pills para select no cabeçalho do card (`LIST_HEADER_SELECT_SX`, compartilhado com Usuários); título do card mostra a categoria selecionada.
- Usuários: removido o texto explicativo que ficava fora do card.
- Listagens: filtros/busca/ações de Procedimentos e Usuários movidos para dentro do card da tabela (como Pacientes, Documentos, Estoque, Financeiro, Despesas recorrentes e Mensagens), via novo `ListCardHeader` (`ListSearchField`, `ListHistoryButton`, `LIST_HEADER_ACTION_SX`); Pacientes passa a usá-lo.

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
