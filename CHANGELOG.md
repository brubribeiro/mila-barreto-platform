# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

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
