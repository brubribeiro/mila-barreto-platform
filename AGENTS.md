# Instruções para agentes de IA (Cursor, Claude, etc.)

**Leia este arquivo por completo antes de qualquer alteração no repositório.**

Repositório monorepo da plataforma **Mila Barreto** (clínica de estética).

```
mila-barreto-platform/
├── backend/     NestJS 10 + Prisma + PostgreSQL
├── frontend/    React 18 + Vite + MUI 5 + TanStack Query
└── docker-compose.yml
```

---

## 1. Fluxo obrigatório antes de codar

1. Entender o pedido do usuário e o **escopo mínimo** necessário.
2. Ler os arquivos que serão alterados e **código adjacente** (convenções, imports, padrões).
3. Verificar se a mudança exige **backend e frontend** (API, DTO, Prisma, tipos, página).
4. Não assumir comportamento: buscar no código (`grep` / busca semântica).
5. Ao terminar, checar lints nos arquivos editados; não deixar imports mortos ou tipos quebrados.

---

## 2. Comunicação e git

| Assunto | Regra |
|--------|--------|
| Respostas ao usuário | **Português**, claro e direto |
| Mensagens de commit | **Inglês** (`feat:`, `fix:`, `chore:`, `docs:`) |
| Criar commit / push / PR | **Somente se o usuário pedir explicitamente** |
| Após concluir alterações | **Sempre perguntar** se o usuário quer commitar (nunca commitar automaticamente) |
| `.env`, chaves, tokens | **Nunca** commitar; usar `.env.example` |
| Documentação nova (README, etc.) | Só criar se o usuário pedir |

---

## 3. Princípios de código

- **Escopo mínimo**: corrigir só o necessário; não refatorar áreas não relacionadas.
- **Sem over-engineering**: evitar abstrações para um único uso; não tratar edge cases impossíveis.
- **Seguir o existente**: nomes, estrutura de pastas, estilo de DTOs, hooks, componentes MUI.
- **Comentários**: só para regra de negócio não óbvia.
- **Testes**: adicionar apenas se pedido ou se cobrirem comportamento real importante.

---

## 4. Backend (`backend/`)

- **Stack**: NestJS, Prisma, PostgreSQL, class-validator nos DTOs.
- **Migrações**: alterou `schema.prisma` → criar migration (`prisma migrate dev`); não editar migration já aplicada em produção sem combinar com o usuário.
- **Validação**: DTOs com decorators; erros HTTP coerentes (`NotFoundException`, etc.).
- **Uploads / arquivos**: usar **Cloudflare R2** (`R2StorageService`, `storageKey`, `fileUrl` / `photoUrl`). **Não** reintroduzir Google Drive.
- **Datas**: cuidado com fuso (UTC vs local) em agendamentos e filtros por mês.
- **Configurações globais**: preferir `app_settings` (ex.: `hourly_cost.include_variable`) quando a preferência afeta vários módulos.
- **Custo/hora**: lógica central em `src/common/utils/hourly-cost.util.ts`; procedimentos usam financeiro do mês; tela de despesas recorrentes pode usar catálogo (`useRecurringCatalog: true`).

---

## 5. Frontend (`frontend/`)

- **Stack**: React 18, Vite, MUI 5, TanStack Query v5, Axios (`src/api/`), React Router 6.
- **Tema**: rosé gold em `src/theme/`; reutilizar `PageHeader`, `AppDataGrid`, `ListFiltersBar`, `FILTER_FIELD_SX`.
- **Dados**: React Query com `queryKey` estáveis; em toggles/filtros usar `placeholderData: keepPreviousData` e updates otimistas para evitar **piscar** e scroll da página.
- **Invalidação**: invalidar só as queries necessárias (evitar `invalidateQueries` no pai que recarrega listas inteiras sem necessidade).
- **Modais MUI**: `TabPanel` com altura fixa quando há abas; evitar `height: auto` + filhos `position: absolute` (conteúdo some).
- **Contextos**: manter apenas `AuthContext.tsx` / `AppDialogContext.tsx` — **não** criar `.ts` vazio com o mesmo nome (sombreia o `.tsx` e causa tela branca).
- **Tipos**: alinhar com `src/types` e respostas da API em `src/api/`.
- **Formulários**: padrão existente (react-hook-form onde já usado).

---

## 6. Armadilhas conhecidas

| Problema | Causa / solução |
|----------|----------------|
| Tela branca no frontend | Arquivo `.ts` vazio duplicando `.tsx` em `contexts/` |
| Modal de paciente vazia | Altura/colapso de abas; seguir `PatientFormDialog` atual |
| Toggle custo/hora piscando | Card desmontando ou invalidação ampla; manter dados anteriores + prefetch |
| `prisma generate` EPERM | Servidor Nest rodando; parar processo ou avisar usuário |
| Build `ImportMeta.env` | Tipagem Vite em `vite-env.d.ts` (já existente no projeto) |

---

## 7. Módulos principais (referência rápida)

| Módulo | Backend | Frontend |
|--------|---------|----------|
| Auth / usuários | `auth/`, `users/` | `Login`, `AuthContext`, `Layout` |
| Pacientes | `patients/` | `PatientFormDialog`, `Patients` |
| Agenda | `appointments/` | `Appointments` (FullCalendar) |
| Procedimentos | `procedures/` | páginas de procedimentos |
| Financeiro | `finance/`, `recurring-expenses/` | `RecurringExpenses`, componentes em `finance/` |
| Estoque | `inventory/` | páginas de estoque |
| Documentos / fotos | `documents/`, R2 | `documents.ts`, upload em formulários |

---

## 8. Ambiente local

- API: `http://localhost:3333/api` (prefixo `/api`)
- Frontend: Vite (porta padrão do projeto); `VITE_API_URL` em `.env`
- Banco: Docker Compose — Postgres `localhost:5432`, db `mila_platform`
- Seed: `admin@mila.com` / `admin123`

---

## 9. Checklist antes de entregar

- [ ] Mudança atende só o que foi pedido
- [ ] Backend e frontend consistentes (se aplicável)
- [ ] Sem segredos em arquivos versionados
- [ ] Sem arquivos `.ts` fantasma em `contexts/`
- [ ] UI sem regressão de layout (modais, cards, toggles)
- [ ] Lints dos arquivos editados verificados
- [ ] Perguntou ao usuário se deseja commitar as alterações

---

## 10. Versionamento

- **Fonte da verdade:** arquivo `VERSION` na raiz (`MAJOR.MINOR.PATCH`).
- **Sincronizar:** `npm run version:sync` na raiz (atualiza `package.json` do monorepo, frontend e backend).
- **Changelog:** registrar mudanças em `CHANGELOG.md`.
- **Quando bumpar:** a partir de agora, avaliar bump SemVer ao entregar funcionalidade, correção relevante ou release; PATCH (bugfix), MINOR (feature), MAJOR (breaking).
- **UI:** versão exibida no menu lateral e na tela de login (`frontend/src/version.ts`).
- **API:** `GET /api/health` retorna `{ status, version }`.

Detalhes completos: `.cursor/rules/versioning.mdc`.

---

*Última atualização: junho/2026 — manter este arquivo alinhado quando novas convenções forem adotadas.*
