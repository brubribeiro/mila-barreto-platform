# Release Notes — Mila Barreto Platform

Notas de versão para usuários do painel. Para detalhes técnicos, veja [CHANGELOG.md](./CHANGELOG.md).

---

## v0.1.6 — 9 jun 2026

### Novidades

**Agenda — pendências**
- Alerta amarelo no topo da agenda quando existem agendamentos **já passados** que ainda não foram concluídos, cancelados ou marcados como falta.
- Clique em **Ver detalhes** para expandir a lista; toque em um item para abrir o formulário e atualizar o status.

**Anamnese — medidas corporais**
- Nova seção com **peso** (kg) e **altura** (cm).
- O **IMC** é calculado automaticamente ao preencher os dois campos, com classificação e cor indicativa.
- A visualização da anamnese também exibe o IMC quando disponível.

**Carregamento mais suave**
- Dashboard, financeiro, agenda, indisponibilidades e despesas recorrentes exibem indicadores de carregamento enquanto os dados são buscados, em vez de mostrar valores vazios ou zerados.

**Histórico de alterações**
- Registros de auditoria passam a mostrar nomes legíveis (ex.: paciente, procedimento) e status em português, em vez de códigos internos.

### Correções

**Paciente**
- Campos pessoais sem valor (como CPF em branco) deixam de aparecer na ficha.

**Notificações**
- Feedback ao marcar todas as notificações como lidas.

### Onde ver a versão

Menu lateral (rodapé) e tela de login exibem **v0.1.6**.

---

## v0.1.5 — 8 jun 2026

### Correções

**Formulário de agendamento**
- O botão **Salvar** deixa de ficar bloqueado ao escolher um procedimento enquanto o sistema ainda atualiza a lista de profissionais disponíveis.
- Ao selecionar um profissional manualmente, a escolha **não é mais trocada** sozinha quando você preenche data, horário ou outro campo.
- Mensagem **“Atualizando disponibilidade...”** aparece durante a verificação em segundo plano, sem impedir o envio quando os dados já estão na tela.

### Onde ver a versão

Menu lateral (rodapé) e tela de login exibem **v0.1.5**.

---

## v0.1.4 — 8 jun 2026

### Novidades

**Feedback ao salvar e excluir**
- O painel passa a exibir **avisos na parte inferior da tela** (toasts) ao concluir ações com sucesso ou quando algo dá errado — em agendamentos, pacientes, estoque, financeiro, procedimentos e demais telas do sistema.
- Mensagens de erro da API ficam mais visíveis, sem depender só de modais.

### Correções

**Agenda — excluir agendamento**
- Ao confirmar a exclusão, a modal fecha na hora e o evento **some do calendário imediatamente**, sem aquele atraso entre fechar a janela e o item desaparecer.
- Modal de confirmação mostra **quem e quando** será excluído (ex.: paciente e horário), em vez de texto genérico repetido.

### Onde ver a versão

Menu lateral (rodapé) e tela de login exibem **v0.1.4**.

---

## v0.1.3 — 11 jun 2026

### Correções

**Agendamento de procedimentos**
- Corrigido erro ao agendar atendimentos do tipo **Procedimento** em produção (mensagem genérica “Internal Server Error”). Avaliações e demais tipos já funcionavam; procedimentos com materiais de estoque falhavam na API hospedada no Render.
- Ao salvar agendamento, erros passam a exibir mensagem clara (ex.: estoque insuficiente, horário indisponível, procedimento inválido), em vez de erro genérico.

**Formulário de agendamento**
- Validação mais rigorosa antes de enviar (procedimento e profissional válidos).
- Melhor feedback quando a disponibilidade do profissional ainda está sendo verificada.

### Onde ver a versão

Menu lateral (rodapé) e tela de login exibem **v0.1.3**.

---

## v0.1.2 — 9 jun 2026

### Correções

**Preferências de notificação**
- Os toggles na modal de preferências passam a responder na hora ao toque, sem atraso perceptível enquanto a preferência é salva.

### Onde ver a versão

Menu lateral (rodapé) e tela de login exibem **v0.1.2**.

---

## v0.1.1 — 9 jun 2026

Correções de estabilidade no painel web, principalmente após o deploy em `/painel`.

### Correções

**Logout e sessão expirada**
- Ao sair da conta ou quando a sessão expira, o sistema redireciona corretamente para a tela de login (`/painel/login`), em vez de abrir uma página em branco.

**Modais em monitores menores**
- Formulários em modal (agendamento, paciente, pacote, procedimento, estoque, financeiro e outros) passam a rolar quando a altura da tela é insuficiente — o conteúdo não fica mais cortado sem barra de scroll.

**Navegação no Vercel**
- Atualizar a página ou acessar um link direto dentro do painel (ex.: `/painel/agendamentos`) deixa de retornar erro 404; o roteamento client-side funciona após refresh.

### Onde ver a versão

Menu lateral (rodapé) e tela de login exibem **v0.1.1**.

---

## v0.1.0 — 8 jun 2026

Primeira versão versionada da plataforma.

### Novidades

**Versão visível no painel**
- Número da versão exibido no menu lateral e na tela de login, facilitando suporte e diagnóstico.

**Deploy do painel em `/painel`**
- Frontend configurado para rodar sob o caminho `/painel`, alinhado ao deploy em produção.

**Infraestrutura**
- API com endpoint `GET /api/health` retornando status e versão.
- Configuração de deploy no Render (backend) e suporte a connection pooling do Neon/Prisma.

**Interface — modais padronizadas**
- Redesign visual compartilhado nos formulários de: agendamento, pacientes, indisponibilidade, pacotes, estoque (item e compra em lote), financeiro, despesas recorrentes, formas de pagamento, promoções, profissionais, perfis de acesso, mensagens, equipamentos e procedimentos.

---

## Próximas versões

Itens em desenvolvimento serão listados aqui antes de cada release. Consulte a seção `[Unreleased]` do [CHANGELOG.md](./CHANGELOG.md) para o registro técnico em andamento.
