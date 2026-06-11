# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

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
