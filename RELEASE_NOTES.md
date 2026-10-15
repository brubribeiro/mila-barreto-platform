# Release Notes — Mila Barreto Platform

Notas de versão para usuários do painel. Para detalhes técnicos, veja [CHANGELOG.md](./CHANGELOG.md).

---

## v0.2.0 — 15 jul 2026

### Novidades

**Visual Aurora**
- O painel ganhou um novo visual com cores verde-água, fonte **Plus Jakarta Sans** e ícones de traço mais leves.
- O **menu lateral** ficou escuro, com seções organizadas (Principal, Catálogo, Financeiro, Equipe, Configurações) e destaque verde no item ativo.
- Cards, botões e tabelas foram refinados para um layout mais limpo e moderno.

**Notificações**
- O sino de notificações na barra superior foi redesenhado para combinar com o novo estilo.
- O painel de notificações exibe contador de novas, botão **Marcar lidas** no topo e lista com destaque para itens não lidos.
- Acesso às **preferências de notificação** ficou no rodapé do painel, com modal redesenhado e toggles mais claros por tipo de alerta.

**Dashboard**
- A tela inicial foi reorganizada no estilo Aurora, com cards de resumo mais claros: **faturamento do mês**, **itens em baixa**, **agendamentos hoje**, **novos pacientes** e **taxa de ocupação**.
- Nova seção **Agenda da semana** com horários, paciente, procedimento e status em destaque; clique em um item para abrir o agendamento.
- Cards de **aniversariantes**, **contas a pagar** e **datas comemorativas** redesenhados, com visual mais compacto e botão rápido para criar promoção.
- Seção **Metas do mês** adicionada como prévia (em breve).

**Agenda**
- Calendário redesenhado no estilo Aurora, com barra de navegação própria (anterior/próximo, **Hoje**, visões **Dia**, **Semana** e **Mês**).
- Eventos exibem cor por tipo de procedimento e indicador de **status**; legenda de categorias e status visível acima do calendário.
- Agendamentos vinculados a **pacote** mostram badge **Sessão X/Y** no calendário (em vez do nome do procedimento).
- Alerta de **pendências** reformulado, com chips clicáveis e opção de dispensar.
- Botão **Novo agendamento** no topo do painel abre a modal diretamente na agenda.
- Carregamento do calendário com skeleton animado (layout mais estável enquanto os dados chegam).

**Formulário de agendamento**
- Modal redesenhada no estilo Aurora: seções mais claras, campos com rótulos fixos e visual alinhado ao restante do painel.
- Resumo rápido do paciente (visitas concluídas e último atendimento) ao passar o mouse no nome.
- Seção **Pacote** com sessões restantes, botão para ver todas as sessões do pacote e opção de **agendar sessões faltantes** em lote.
- Ao concluir um agendamento antigo, escolha o **mês de referência** para lançar a receita no financeiro correto.
- Modal **Registrar pagamento** com espaçamento revisado e campos mais legíveis.

**Dashboard**
- **Agenda da semana** passa a considerar 7 dias a partir da data selecionada (antes fixava segunda a domingo).
- Card **Contas a pagar** com skeleton de carregamento mais suave.
- Card **Metas do mês** com o mesmo visual do card de Agenda; quando não há metas, o aviso ocupa a largura toda do card.

**Visual geral**
- Barras de rolagem finas e discretas em todo o painel (tema global).
- Campos de formulário (`OutlinedInput`) com fundo levemente cinza e bordas arredondadas.
- Tipografia padronizada em todo o painel; títulos e textos ficam um pouco menores em telas estreitas para melhor leitura no celular.

**Pacientes**
- Lista redesenhada no estilo Aurora: cards de resumo (**total**, **novos no mês**, **ativos**, **receita**), busca por nome/telefone/e-mail/CPF e paginação.
- Cada linha exibe **score de confiabilidade**, **última visita**, **total gasto** e **nº de agendamentos**.
- Ficha do paciente reorganizada com abas **Geral**, **Agendamentos**, **Pacotes**, **Anamnese** e **Fotos**.
- Nova galeria **Fotos · antes e depois**, vinculada a um atendimento, com upload de par antes/depois (armazenamento comprimido).
- Botão **Novo agendamento** na ficha abre a modal já com o paciente selecionado.
- Modal de **anamnese** com visual Aurora alinhado ao restante do painel.

**Procedimentos**
- Lista redesenhada no estilo Aurora: busca, filtro por **categoria**, paginação e colunas de **margem**, **custo de materiais** e **custo de equipamentos**.
- Cadastro com **categoria** (Facial, Injetáveis, Laser, etc.), vínculo de **equipamentos** com custo por uso e opção **Mapa de aplicação** (em breve).
- Modal de procedimento reorganizada em seções padronizadas.

**Formulários**
- Modais de cadastro (paciente, financeiro, estoque, pacotes, profissionais, etc.) passam a usar seções visuais consistentes (**FormSection**), alinhadas ao estilo Aurora.

**Barra superior**
- Sino de notificações reposicionado; botão **Novo agendamento** com estilo outlined.

**Pacotes**
- Tela redesenhada no estilo Aurora: cards de resumo (**pacotes ativos**, **pacientes com pacote**) e grade de cards por pacote.
- Cada card exibe **preço original**, **preço de venda**, **economia (%)**, **sessões** e **pacientes ativos**.
- Destaque automático **Mais vendido** e badges manuais (**Mais vendido**, **Recorrente**) configuráveis no cadastro.
- Busca por nome, descrição ou procedimentos inclusos; modal de cadastro reorganizada em seções.
- Paginação na grade (8 pacotes por página) quando a lista cresce.

**Promoções**
- Tela redesenhada no estilo Aurora: cards com **status** (Ativa, Agendada, Encerrada), badge de desconto e **período** da campanha.
- Contador de **promoções ativas** no topo; busca por nome, data comemorativa ou descrição.
- Modal de cadastro reorganizada: tipos **Percentual**, **Valor fixo** e **Combo**; opção **Aplica-se a** (todos, procedimentos ou pacotes).
- Data comemorativa selecionável (Dia das Mães, Black Friday, etc.).
- Paginação na lista (8 campanhas por página) e interruptor em cada card para **ativar ou desativar** sem abrir o cadastro.

**Formas de pagamento**
- Tela redesenhada no estilo Aurora: grade de cards por forma de pagamento, com inicial colorida, **taxa** em destaque (verde quando não há taxa) e o **valor líquido** recebido a cada R$ 100.
- Cada card mostra em quantos **lançamentos** a forma já foi usada; formas inativas aparecem esmaecidas com a etiqueta **Inativa**.
- Clique no card para editar; ações rápidas de editar e excluir, busca, filtro de status e histórico de alterações.
- Modal de cadastro reorganizada em seções **Identificação** e **Taxa da maquininha**, com prévia da taxa e do valor líquido.

**Grupos e permissões**
- Tela redesenhada no estilo Aurora: grupos em cards à esquerda (com cor e número de membros) e, ao lado, a matriz de permissões do grupo selecionado (**Ver**, **Criar**, **Editar**, **Excluir** por módulo).
- As permissões são ajustadas direto na matriz: clique numa célula, no nome do módulo (linha inteira) ou no título da coluna; depois **Salvar permissões** ou **Descartar**.
- Novo grupo em modal mais simples: nome, descrição, **copiar permissões de** um grupo existente, **cor do grupo** e restrição à própria agenda.

**Documentos**
- Tela redesenhada no estilo Aurora: resumo com total de documentos, **assinados**, **pendentes** e **modelos ativos**.
- Cada documento agora tem **status** — Pendente, Enviado ou Assinado — exibido na lista e alterável pelo menu da linha.
- **Modelos de documento**: crie termos de consentimento, fichas de anamnese, autorizações etc. com campos como nome, CPF e data, preenchidos automaticamente com os dados do paciente. Já vêm 3 modelos padrão.
- **Novo documento**: gere a partir de um modelo (abre pronto para imprimir) ou anexe um arquivo arrastando ou clicando; escolha tipo, paciente ou equipamento, status e observações.
- Depois de assinado, use **Anexar versão assinada** para guardar o arquivo; o documento passa para Assinado.
- Filtros de **status**, **tipo** e **vínculo**, busca, paginação e histórico de alterações.

**Equipamentos**
- Tela redesenhada no estilo Aurora: cards de resumo (**equipamentos**, **operacionais**, **manutenção atrasada** e **manutenção nos próximos 30 dias**) e grade de cards por equipamento.
- Cada card mostra **status** (Operacional, Manut. atrasada, Inativo), barra do **ciclo de manutenção** com dias restantes, datas agendada/automática e valores da máquina e da manutenção.
- Clique no card para editar; ações rápidas para **registrar manutenção**, editar e excluir. Filtros de manutenção e status, busca e paginação.
- Modal de cadastro reorganizada em coluna única, com seções **Aquisição** e **Manutenção**.

**Usuários**
- Nova tela **Usuários** no menu Equipe: lista com busca, filtros por **grupo**, **profissional** e **status**, e ações de editar e excluir.
- Formulário unificado para criar ou editar conta: grupo de permissão, vínculo como **profissional**, marcação **Principal** e dados de perfil quando aplicável.
- Administradores podem **personificar** outro usuário ativo direto da lista (com confirmação).
- Histórico de alterações disponível para administradores.

**Despesas recorrentes**
- Tela redesenhada no estilo Aurora: cards de resumo com **total mensal** (e projeção anual), divisão entre **fixas e variáveis**, **contas ativas** e despesas que **vencem nos próximos 7 dias**.
- Painel **Custo por hora operacional** mostra carga horária do mês, custo fixo, base de cálculo e o valor por hora; pode ser **minimizado** e mantém o interruptor **Incluir custos variáveis**.
- Lista em tabela com tipo, categoria, valor, lançamentos gerados, **próximo vencimento** e status; filtros por tipo e status, busca e paginação.
- Modal de cadastro reorganizada em coluna única, com interruptor **Despesa ativa**.

**Mensagens**
- Tela redesenhada no estilo Aurora: lista de **modelos de mensagem** à esquerda e, à direita, a prévia do modelo selecionado em um balão de conversa do WhatsApp, com as variáveis destacadas.
- Cada modelo tem um **gatilho de envio** (Ao agendar, 1 dia antes, No dia do aniversário, Após o atendimento, 90 dias sem visita ou Envio manual) e pode ser **ativado ou desativado** com um clique.
- Novo modal **Novo modelo de mensagem**: título, gatilho, mensagem com emojis e variáveis clicáveis (**{nome}**, {procedimento}, {data}, {hora}, {profissional}, {valor}).
- Ao enviar pelo WhatsApp (Agenda, Pacientes, Dashboard), só aparecem modelos ativos e o modelo certo é sugerido pelo gatilho. Modelos antigos com {paciente_nome} continuam funcionando.

**Login**
- Tela de entrada redesenhada no estilo Aurora: painel verde-escuro com a marca e o resumo da plataforma, e ao lado o botão **Entrar com o Google**, o aviso de acesso exclusivo e o atalho **Fale com o administrador**.
- Os links de **Termos de Uso** e **Política de Privacidade** continuam na tela; no celular o painel de marca é ocultado e o login ocupa a tela toda.

**Metas**
- Nova tela **Metas** no menu Análise: resumo com metas ativas, atingidas e progresso médio, e um card por meta com valor atual, objetivo, barra de progresso e status (**Atingida**, **Quase lá**, **No caminho** ou **Atenção**).
- O valor atual é calculado sozinho para **faturamento**, **novos pacientes**, **procedimentos realizados**, **ticket médio**, **ocupação da agenda** e **taxa de retorno**; para outros objetivos, informe o valor manualmente.
- Metas mensais, trimestrais ou anuais, com cor escolhida e filtro entre metas em andamento, próximas e encerradas.
- O card **Metas do mês** do Dashboard agora mostra as metas reais do mês selecionado.
- Acesso controlado pela nova permissão **Metas** nos grupos (administradores já têm acesso).

**Central de Pendências**
- Nova tela **Pendências** no menu Principal, que reúne o que precisa de atenção na clínica: estoque abaixo do mínimo, produtos perto do vencimento, contas a vencer, agendamentos sem desfecho, manutenção de equipamentos, documentos sem assinatura e datas comemorativas sem promoção.
- As pendências são separadas em **Urgentes**, **Atrasadas** e **Próximas**, com contadores, filtro por categoria e gráfico por categoria. O card **Foco de hoje** mostra as 3 mais importantes.
- Cada pendência mostra prazo e **responsável** (clique para trocar), pode ser marcada como **resolvida** e tem o botão **Ver detalhes**, que abre a tela de origem. As resolvidas dos últimos 30 dias ficam no card **Resolvidas** e podem ser reabertas.
- Em **Regras**, escolha o que gera pendência automaticamente, a antecedência de cada alerta e o responsável padrão.
- Crie pendências manuais em **Nova pendência** e exporte a lista em **Relatório de pendências** (CSV).
- Acesso controlado pela nova permissão **Pendências** nos grupos (Recepção e Profissional já recebem acesso).

**Profissionais**
- Tela redesenhada no estilo Aurora: grade de cards com **foto**, função, registro profissional e **áreas de atuação** (Toxina, Preenchimento, etc.).
- Badge de **disponibilidade em tempo real**: Disponível, Em atendimento, Folga ou Fora do horário (com base no expediente e indisponibilidades).
- Contadores de atendimentos (**total**, **último mês** e **última semana**) em cada card.
- Contagem no topo de profissionais cadastrados e quantos estão **disponíveis agora**; botão **Adicionar profissional** abre o cadastro já como profissional.
- Perfil completo no cadastro de usuário: **cor no calendário**, **bio**, **foto** (upload) e registro no conselho.

**Métricas**
- Tela redesenhada no estilo Aurora, com quatro indicadores no topo: **receita de procedimentos**, **ticket médio**, **taxa de retorno** e **no-show**, cada um comparado ao período anterior.
- Abas em formato de botões coloridos (Agendamentos, Pacientes, Procedimentos, Pacotes e Financeiro) e indicadores de cada aba reunidos numa faixa só.
- Gráficos mais limpos: barras com valor visível, ranking de **receita por procedimento**, **retenção** de pacientes em anel, **margem** por procedimento e **receita por categoria** no financeiro.

**Política de Privacidade**
- Página redesenhada no estilo Aurora: cabeçalho fixo com botão **Voltar ao login**, texto em card com leitura mais confortável e link para os **Termos de Uso** no rodapé. O conteúdo da política não mudou.

**Termos de Uso**
- Página de Termos de Uso no estilo Aurora: cabeçalho fixo com botão **Voltar ao login**, texto em um card único mais legível e link para a **Política de Privacidade** no rodapé. O conteúdo dos termos não mudou.

### Correções

**Agenda e disponibilidade**
- Validação do expediente do profissional passa a usar horário de **Brasília**, evitando rejeição indevida de horários válidos.
- Formulário de agendamento deixa de fazer consulta extra de profissionais disponíveis ao abrir com horário padrão.

### Onde ver a versão

Menu lateral (rodapé) e tela de login exibem **v0.2.0**.

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
