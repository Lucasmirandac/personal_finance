# Saldo Real

Painel financeiro pessoal **local e privado**. Agrega gastos manuais, contas, despesas fixas e (opcionalmente) faturas de cartão em uma visão única; projeta o saldo dos próximos meses; alerta sobre orçamentos estourados e sugere transformar assinaturas detectadas em despesas recorrentes.

Tudo roda no navegador — sem backend, sem upload, sem cadastro. Os dados ficam no IndexedDB do próprio dispositivo e podem ser exportados/restaurados via backup JSON a qualquer momento.

---

## Princípios

- **Local-first.** Nenhuma transação sai do navegador. Uma rota OAuth (`/api/oauth/google/token`) troca apenas tokens Google Drive — sem dados financeiros.
- **Sem cadastro.** Abra `/comecar`, cadastre contas e renda e use — importar CSV é opcional.
- **Português.** UI, mensagens e exportações em pt-BR.
- **Decisão antes do gasto.** O foco não é só ver onde o dinheiro foi — é responder "dá pra gastar isso agora?".
- **Reversível.** Edições são lógicas; exclusões podem ser restauradas; backup sempre disponível.

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** com tokens próprios em `src/styles/theme.css`
- **PapaParse** para CSV, **Zod** para validação
- **Recharts** para gráficos, **@tanstack/react-table** para a tabela detalhada
- **write-excel-file** para exportação Excel multi-aba
- **idb-keyval** para persistência local em IndexedDB
- **lucide-react** para ícones, **Geist** (sans + mono) via `next/font/google`
- **Vitest** para testes unitários

---

## Início rápido

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` (landing de marketing) ou vá direto para `http://localhost:3000/comecar` (app). Na primeira vez, o onboarding em `/comecar` leva você por:

1. Cadastrar contas (conta corrente, poupança, carteira; cartão opcional).
2. Cadastrar renda (receita recorrente) — necessário para concluir o setup.
3. (Opcional) Importar CSV (Inter ou Nubank) e/ou configurar o **Divisor de Águas**.

Depois disso, o app redireciona automaticamente para `/saldo` (Hoje) ou `/dashboard` (Análise), conforme a projeção estiver pronta.

Build de produção:

```bash
npm run build
npm start
```

Testes:

```bash
npm test
```

### PWA

O app é instalável como PWA (`src/app/manifest.ts`). O `start_url` aponta para `/comecar`; ícones em `public/pwa/`. Depois de carregar uma vez, o painel funciona offline com dados locais.

### Suporte / reportar bug

O footer da aplicação inclui **Reportar bug**, que abre o cliente de e-mail do usuário via `mailto:` (nada é enviado automaticamente pelo app).

Configure em `.env.local`:

```bash
NEXT_PUBLIC_SUPPORT_EMAIL=seu-email@exemplo.com
NEXT_PUBLIC_SITE_URL=https://saldoreal.app   # canonical URLs e sitemap (opcional em dev)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX   # métricas opcionais; omitir = desligado
```

Se `NEXT_PUBLIC_SUPPORT_EMAIL` não estiver definido, o fallback de desenvolvimento é `bugs@saldoreal.app`. A versão do app (`NEXT_PUBLIC_APP_VERSION`) é injetada automaticamente a partir do `package.json` no build.

---

## Páginas

### App (dados locais)

| Rota | O que faz |
|------|-----------|
| `/comecar` | Onboarding; redireciona para `/saldo` ou `/dashboard` quando o setup já estava concluído |
| `/saldo` | **Hoje** — saldo atual, limite diário, alertas, lançamentos do dia, fechamento de mês e conquistas |
| `/extrato` | Extrato de contas (corrente, poupança, carteira) por mês, com status de pagamento |
| `/faturas` | Faturas de cartão agrupadas por ciclo de fechamento/pagamento, com teto mensal |
| `/futuro` | Projeção de saldo (gráfico ou calendário), KPIs de horizonte e timeline de eventos |
| `/divisor` | **Divisor de Águas** — renda, custos fixos e categorias estruturais (página dedicada) |
| `/dashboard` | Análise histórica com tabs (ver abaixo) |
| `/recorrentes` | CRUD de despesas fixas e receitas + painel de assinaturas detectadas |
| `/transacoes` | Tabela detalhada com filtros, busca, ordenação, edição, exclusão lógica e auto-categorização |
| `/config` | Configurações em tabs (ver abaixo) |
| `/regras` | Atalho legado que redireciona para `/config?tab=classificacao` |

**Tabs do dashboard** (`?tab=...`): `geral`, `comparar`, `orcamentos`, `cartao`, `habitos`, `patrimonio`, `categorias`, `estabelecimentos`.

**Tabs de config** (`?tab=...`): `importar`, `classificacao`, `apelidos`, `contas`, `cartoes`, `orcamentos`, `conquistas`, `backup`, `privacidade`.

Várias páginas suportam deep link por query string (`?tab=...`), usado pelos widgets do header.

### Navegação

- **Desktop:** header com `Hoje`, `Extrato`, `Faturas`, `Futuro`, `Divisor`, `Análise` e menu **Gerenciar** (importar, classificação, contas, cartões, recorrentes, etc.).
- **Mobile:** barra inferior com `Hoje`, `Extrato`, `Futuro`, FAB de Quick Add e sheet **Mais** (faturas, divisor, análise, atalhos de config).

### Site de marketing (sem dados financeiros)

| Rota | O que faz |
|------|-----------|
| `/` | Landing — promessa do produto, FAQ, CTAs para `/comecar` |
| `/artigos` | Índice de artigos |
| `/artigos/[slug]` | Artigo individual |
| `/guias/importar-nubank` | Como importar CSV Nubank |
| `/guias/importar-inter` | Como importar CSV Inter |
| `/guias/como-poupar` | Reserva mensal e meta de poupança |
| `/guias/usar-sem-importar` | Usar o app sem CSV |
| `/ferramentas/limite-diario` | Calculadora pública de limite diário |
| `/ferramentas/posso-comprar` | Calculadora pública do simulador |
| `/ferramentas/reserva-poupar` | Calculadora pública de reserva para poupar |

Rotas de marketing listadas em `src/lib/marketing/site.ts` e no `sitemap.ts`.

---

## Importação de CSV

Os formatos são detectados automaticamente pelos cabeçalhos. A importação é **opcional** — você pode usar só lançamentos manuais e recorrentes.

### Inter (fatura do cartão)

```
"Data","Lançamento","Categoria","Tipo","Valor"
"25/05/2026","DL*UberRides","TRANSPORTE","Compra à vista","R$ 20,10"
```

- Data `dd/mm/yyyy`; valor em formato BRL (`R$ 1.234,56`), aceita negativos.

### Nubank (fatura do cartão)

```
date,title,amount
2026-04-13,Pagamento recebido,-267.90
2026-04-12,Lucas De Miranda Costa,318.52
```

- Data ISO `yyyy-mm-dd`; valor decimal com ponto; negativo = crédito/pagamento.

### Múltiplas fontes

Cada upload vira uma `Source` com `id`, `fileName`, `fonte`, `importedAt`, `rowsRaw` e `raw`. Cada fonte pode ser removida individualmente ou em lote em `/config?tab=importar`. Ao importar Inter/Nubank pela primeira vez, o app cria automaticamente uma conta cartão correspondente.

### Classificação automática

Cada lançamento recebe uma `natureza`:

- **Gasto** — consumo de fato. `valorAnalise = valorOriginal`.
- **Pagamento de fatura** — bate com algum padrão da regra de pagamento. `valorAnalise = 0`.
- **Estorno / crédito** — valor negativo OU bate com padrão de estorno. `valorAnalise = 0`.

Padrões padrão (editáveis em `/config?tab=classificacao`):

- **Pagamento**: `PAGAMENTO ON LINE`, `PAGTO DEBITO AUTOMATICO`, `PAGAMENTO DE FATURA`, `PAG FATURA`.
- **Estorno/crédito**: `ESTORNO`, `CREDITO`, `CRÉDITO`, `DEVOLU`, `CANCELAMENTO`, `REEMBOLSO`.

A comparação é case-insensitive e sem acentos. O painel mostra uma pré-visualização do impacto antes de salvar.

### Apelidos de estabelecimento

Em `/config?tab=apelidos`, você define que `"DL*UBERRIDES"` deve aparecer como `"Uber"`, agrupando variações do mesmo estabelecimento sob um nome único. Os apelidos entram em todas as agregações e exportações.

---

## Contas

Modelo `Account` (`src/lib/accounts.ts`):

- `id`, `nome`, `kind` (`cc` | `poupanca` | `carteira` | `cartao`), `saldoInicial`, `dataReferencia`, `ativa`.
- Opcionais: `isDefault`, `fonteCsv`, `diaFechamento`, `diaPagamento`, `limiteMensal` (cartão).

Em `/config?tab=contas` você gerencia contas corrente, poupança e carteira; em `/config?tab=cartoes`, cartões de crédito (fechamento, pagamento e teto mensal de gastos). Também é possível ajustar o horizonte de projeção (30, 60, 90 ou 180 dias). Contas não-cartão formam a âncora do saldo atual; contas cartão vinculam o CSV de fatura e definem fechamento/pagamento para projetar quando a fatura sai do saldo.

### Ajustar saldo

Em `/saldo`, o modal de ajuste permite duas estratégias:

- **Lançamento de ajuste** — cria uma transação manual que corrige a diferença sem mexer no histórico.
- **Atualizar saldo inicial** — define o novo saldo como referência para hoje.

---

## Quick Add

Modal de lançamento rápido acessível pelo botão flutuante (FAB), pelo atalho **`n`** (gasto) ou **`r`** (receita).

- **Seletor no topo**: alterne entre **Gasto** e **Receita**; título, subtítulo, placeholders, sugestões e botão primário adaptam ao modo.
- Campos: valor, descrição, categoria, conta e data (com "Hoje" e "Ontem").
- **Parcelas** (até 24): em gastos no cartão ou conta, divide em lançamentos mensais com descrição `(1/N)`; edição/exclusão em grupo via `installmentGroupEdits`.
- **Gasto**: sugere estabelecimentos do histórico; avisa orçamento (uso atual e impacto projetado) **antes** de salvar — sem bloquear.
- **Receita**: sugere descrições e categorias de entradas anteriores (ou padrões como Salário, Freela); mostra prévia de quanto o saldo aumenta na conta e data escolhidas.
- "Salvar e adicionar outro/outra" mantém o modal aberto no mesmo modo para registrar uma sequência.
- Em `/transacoes` e `/extrato`, transações podem ser repetidas ou editadas conforme o tipo.

Transações criadas pelo Quick Add ficam com `fonte: "manual"` e `sourceId: "manual:quick"`, separadas das fontes CSV.

---

## Simulador "Posso comprar isso?"

Modal global de simulação acessível pelos atalhos **`s`** ou **`?`** (Shift+/), ou pelo FAB secundário **`?`** (botão flutuante acima do `+`). Não cria transação — só mostra impacto em tempo real enquanto você digita valor, parcelas, categoria e conta.

Calculado em `src/lib/afford.ts`, reutilizando:

- **`projection.ts`** — menor saldo nos próximos 30 e 90 dias (compra injetada como eventos sintéticos de fatura ou saída).
- **`budgets.ts`** — uso projetado do orçamento da categoria no mês corrente.
- **`wealth.ts`** — meses de tranquilidade financeira (Paz Futura) com meta padrão de 20%.

Mostra:

- **Fatura(s)** — parcelas e datas de pagamento (cartão) ou débitos mensais (conta corrente).
- **Saldo mínimo** — antes → depois em 30 e 90 dias.
- **Orçamento** — percentual e status projetados (ok / warning / danger).
- **Paz Futura** — quantos meses de tranquilidade você perde.
- **Semáforo** — verde / amarelo / vermelho com motivos.

Opcionalmente, "Registrar gasto com esses dados" abre o Quick Add já preenchido. Versão pública em `/ferramentas/posso-comprar` (sem persistência).

---

## Recorrentes

Em `/recorrentes`, cadastre regras mensais para despesas fixas (aluguel, boletos) e receitas (salário, aluguéis recebidos).

Modelo `RecurringRule` (`src/lib/recurring.ts`):

- `id`, `kind` (`despesa_fixa` | `receita`), `descricao`, `categoria`, `valor`, `diaMes`, `inicio`, `fim`, `ativo`, `accountId?`.

O sistema **expande** cada regra em transações sintéticas mensais até hoje, com IDs no padrão `manual:${ruleId}:${anoMes}`. Essas transações entram no dashboard como qualquer outra, mas não podem ser editadas na tabela — só na própria regra (exceto ajuste por mês em despesas fixas). `diaMes` é automaticamente ajustado ao último dia válido em meses curtos.

### Detecção de assinaturas

Mesma página tem o painel "Assinaturas detectadas" (`src/lib/subscriptions.ts`), que varre os últimos 6 meses procurando estabelecimentos com:

- 3+ ocorrências em meses distintos
- variação de valor ≤ 5% (mediana × tolerância)
- mediana > R$ 1
- sem regra recorrente equivalente já cadastrada

Cada sugestão exibe nome, valor mediano, número de meses, última cobrança, categoria e variação. Dois cliques disponíveis:

- **Virar despesa fixa** — cria a `RecurringRule` na hora com defaults inteligentes (valor mediano, dia mediano, categoria modal, mês inicial = mais antigo observado).
- **Dispensar** — persiste a chave em `pf:subscriptionDismissals:v1`; a sugestão não reaparece após reload.

---

## Hoje (`/saldo`)

Tela principal para a pergunta "dá pra gastar isso agora?" — foco no **dia e no mês corrente**, não no gráfico de longo prazo.

Mostra:

- Saldo atual (com lançamentos desde a data de referência das contas).
- Indicador de projeção (menor saldo previsto ou "sem saldo negativo no horizonte").
- **Limite diário** (`DailyAllowancePanel`) — sobra do mês ÷ dias restantes, reserva para poupar, teto de cartão e alertas de limite mensal por cartão.
- Resumo de alertas (orçamento, backup, assinaturas, etc.).
- Lançamentos de hoje e resumo de pagamentos do mês (pago / pendente).
- **Fechamento de mês** (`MonthCloseCard`) quando há meses anteriores sem revisar.
- **Conquistas** recentes (`AchievementsCard`).
- Resumo de contas com atalho para gerenciar.

Projeção numérica (7d, próximo compromisso) usa `src/lib/projection.ts` internamente, mas gráfico, calendário e timeline longa ficam em `/futuro`.

---

## Futuro (`/futuro`)

Projeção de saldo de médio prazo — calculada em `src/lib/projection.ts`, partindo da âncora (soma dos saldos iniciais ativos não-cartão):

- **Faturas de cartão** agrupadas pela data de pagamento, respeitando `diaFechamento` e `diaPagamento` de cada cartão.
- **Despesas fixas e receitas recorrentes** dentro do horizonte configurado.

A página mostra:

- KPIs em 7, 30 e 90 dias, menor saldo e data, receitas/saídas futuras.
- Gráfico de linha (`BalanceProjectionChart`) **ou** calendário mensal com eventos (`SaldoCalendarView`) — alternável; preferência salva em `settings.saldoView`.
- Timeline de receitas e despesas futuras com filtros; eventos clicáveis para editar recorrentes ou lançamentos manuais.

### Projeção de Paz Futura

Tab **Patrimônio** no dashboard (`/dashboard?tab=patrimonio`) com `WealthProjectionPanel`, calculada em `src/lib/wealth.ts` e `src/lib/savings.ts`, reutilizando o Divisor de Águas (`src/lib/leverage.ts`):

- **Renda disponível** = receitas recorrentes − custos fixos.
- **Patrimônio inicial** = soma dos saldos das contas ativas não-cartão.
- **Aporte mensal** = percentual ou valor fixo da renda disponível (meta em `settings.poupanca`).
- **Patrimônio projetado** = patrimônio inicial + aportes acumulados (sem juros no MVP).
- **Meses de tranquilidade** = patrimônio ÷ custo fixo mensal.

Exemplo de copy: *"Mantendo sua meta de 20%, em dez/26 seu patrimônio terá crescido R$ X, te garantindo Y meses de tranquilidade financeira."*

### Saldo diário disponível

Calculado em `src/lib/dailyAllowance.ts`:

- **Renda disponível** = receitas recorrentes − custos fixos
- **Reserva para poupar** = aporte mensal configurado (`settings.poupanca`), reduz a sobra antes do cálculo
- **Sobra do mês** = renda disponível − reserva − gasto variável já feito − fatura aberta do cartão
- **Saldo diário** = max(0, sobra do mês ÷ dias restantes) — nunca negativo; quando a renda já foi comprometida, mostra R$ 0,00 e o excesso
- **Teto para novos gastos no cartão** = max(0, renda disponível − reserva − fatura em aberto)

Aparece em `/saldo` (`DailyAllowancePanel`). Configuração de reserva no próprio painel ou em `/guias/como-poupar`.

### Reserva para poupar

Preferência `SavingsPreference` em `settings.poupanca`:

- **Percentual** — % da renda disponível (5–80%, padrão 20%).
- **Valor fixo** — teto mensal em reais (limitado à renda disponível).

Reduz limite diário e entra na projeção patrimonial. Removível a qualquer momento.

---

## Extrato (`/extrato`)

Visão mensal de lançamentos em **contas de caixa** (corrente, poupança, carteira) — não inclui compras de cartão (essas ficam em `/faturas`).

- Navegação por mês e filtro por conta.
- Agrupamento por dia com totais de entrada/saída.
- **Status de pagamento** para despesas fixas e lançamentos manuais de saída (`src/lib/paymentStatus.ts`): `pago`, `a_pagar`, `vencida`, `a_confirmar`, `previsto`.
- Filtros: todos, pendentes, pagos.
- Edição, reversão e exclusão conforme tipo de transação.

---

## Faturas (`/faturas`)

Visão de **cartões de crédito** agrupada por ciclo de fatura (fechamento → pagamento).

- Seletor de cartão; ciclos futuros primeiro, depois histórico.
- Total da fatura, data de pagamento e lançamentos expandíveis.
- **Teto mensal** (`limiteMensal` em `/config?tab=cartoes`): barra de uso com status ok / warning / danger (`src/lib/cardLimits.ts`).
- Edição de lançamentos individuais ou de grupos parcelados.

---

## Orçamentos por categoria

Modelo `CategoryBudget` (`src/lib/budgets.ts`):

- `id`, `categoria`, `valorMensal`, `ativa`, timestamps.

Status calculado sobre saídas (`tipoFluxo === "saida"`) do mês atual:

- **ok** — abaixo de 80%
- **warning** — entre 80% e 99,99%
- **danger** — 100% ou mais

CRUD em `/config?tab=orcamentos`, com sugestões de categoria vindas das transações já normalizadas. `/dashboard?tab=orcamentos` mostra cards de progresso por categoria. No header, `BudgetAlertWidget` aparece com um chip ("2 perto do limite", "1 orçamento estourado") que linka direto para a tab no dashboard. O Quick Add projeta o impacto **antes** de salvar quando há orçamento na categoria.

---

## Fechamento de mês

`src/lib/monthClose.ts` — revisão de meses encerrados ainda não fechados.

- **Sobra do mês** = renda disponível − gastos (considerando reserva para poupar).
- Top 3 categorias estouradas e com sobra.
- Sugestão: criar orçamento, manter ou aumentar limite de categoria.
- Persistido em `pf:monthClose:v1`; desbloqueia conquista **Mês revisado**.

Card em `/saldo` (`MonthCloseCard`) aparece quando há mês pendente.

---

## Conquistas

Sistema leve de marcos em `src/lib/achievements.ts` — sem gamificação invasiva; pode ser ocultado em config.

| ID | Título | Condição |
|----|--------|----------|
| `primeiro-passo` | Primeiro passo | Primeiro gasto manual |
| `semana-viva` | Semana viva | 7 dias seguidos com lançamentos |
| `mes-fiel` | Mês fiel | 30 dias seguidos com lançamentos |
| `volta-certeira` | Volta certeira | Retorno após pausa nos lançamentos |
| `mes-positivo` | Mês positivo | Mês fechado com sobra |
| `trio-positivo` | Trio positivo | 3 meses com sobra no ano |
| `cofrinho-calmo` | Cofrinho calmo | Soma de sobras mensais > R$ 500 |
| `mes-revisado` | Mês revisado | Fechamento de mês concluído |

Painel completo em `/config?tab=conquistas`; card resumido em `/saldo`.

---

## Filtros, edição e exclusão

O drawer de filtros (`FiltersDrawer`) cobre:

- Data inicial/final (com presets: tudo, últimos 7/30/90, mês atual, mês anterior, YTD)
- Categorias, naturezas, faixas de valor
- Busca por lançamento, estabelecimento e categoria

Os filtros são aplicados em memória e compartilhados entre `/dashboard` e `/transacoes` via `FiltersProvider`.

`TransactionEdit` (`src/lib/edits.ts`) permite alterar `data`, `lancamento`, `categoria`, `tipo` e `valorOriginal` sem modificar o CSV original. Exclusão é lógica (`deleted: true`) e pode ser restaurada. Edições de **grupos parcelados** ficam em `installmentGroupEdits`. Transações manuais do Quick Add são editadas/removidas diretamente. Transações sintéticas de recorrentes só podem ser alteradas via `/recorrentes` (ou por mês, quando permitido).

A modal **Auto-categorizar** (`AutoCategorizeModal`) aplica uma categoria em lote para todas as transações de um estabelecimento.

---

## Insights e KPIs

`src/lib/aggregations.ts` calcula tudo que alimenta dashboard e exportações:

- **KPIs**: receitas, despesas, saldo, gasto no cartão, contagem de consumo, ticket médio, maior compra, excluídos, total bruto.
- **Série mensal**: receitas, despesas, saldo, contagem.
- **Composição** de despesas: cartão vs despesas fixas.
- **Categorias**: total, contagem, participação; top 10 + Outros nos gráficos.
- **Estabelecimentos**: total e contagem.
- **Dia da semana**: total, contagem, top 5 categorias por weekday.
- **Insights automáticos** (`buildInsights`): saldo do período, maior categoria, concentração top 2, estabelecimento líder, média diária no cartão, ritmo vs mês anterior, despesas fixas, pagamentos/estornos excluídos.
- **Hábitos**: fim de semana vs dias úteis, picos por dia, dominância de categoria, micro-transações em 30 dias, gap weekend/weekday, volatilidade.
- **Comparação**: mês atual vs anterior e vs mesmo mês do ano passado, por categoria e total.

---

## Divisor de Águas

Disponível no onboarding (passo 3) e em `/divisor`. Separa o que é **difícil de mudar** (custos fixos estruturais) do que é **gerenciável** no dia a dia (variáveis no cartão).

- **Renda total**: soma das receitas recorrentes ativas (`RecurringRule kind="receita"`).
- **Custo fixo**: despesas fixas recorrentes ativas + categorias do CSV que você marcar manualmente como estruturais.
- **CSV estrutural**: mediana de gasto nos últimos 3 meses fechados por categoria marcada.
- **Anti-dupla-contagem**: se uma categoria já tem despesa fixa recorrente, o CSV dessa categoria não entra de novo.

**Alerta de alavancagem**: se os custos fixos passarem de **50%** da renda cadastrada, o app exibe:

> Seu custo de vida fixo está muito alto para a sua renda atual. Para se reestruturar rápido, avalie negociar esses contratos ou reduzir a estrutura.

Bandas graduadas: saudável (&lt;30%), atenta (30–50%), alta (50–70%), crítica (≥70%).

---

## Backup completo

`src/lib/backup.ts` exporta um JSON único com tudo: dataset, regras, recorrentes, configurações (incl. reserva para poupar), edições, edições de parcelas, contas, transações manuais, orçamentos, dispensas de assinaturas, apelidos, categorias estruturais, conquistas, fechamentos de mês e status de pagamento.

- Versão atual: **V9**. Backups V1–V8 ainda são importáveis (campos novos vêm vazios).
  - **V6** — conquistas
  - **V7** — fechamentos de mês
  - **V8** — edições de grupos parcelados
  - **V9** — status de pagamento
- Nome do arquivo: `backup-YYYY-MM-DD.json`.
- Import aceita colar JSON ou arrastar arquivo.
- Modos:
  - **Substituir** — limpa tudo antes de aplicar o backup.
  - **Mesclar** — adiciona entidades por ID; regras, configurações e edições vêm do backup.

No header, `BackupReminder` mostra um chip quando o último backup tem mais de 14 dias (amarelo) ou 30 dias (vermelho). Linka para `/config?tab=backup`.

---

## Exportações

Em `/dashboard`:

- **Excel (.xlsx)** com as abas: `Dashboard`, `Dados`, `Resumo_Fluxo`, `Resumo_Mensal`, `Resumo_Categorias`, `Estabelecimentos`, `Insights` e `Orcamentos` (quando há orçamentos).
- **CSV tratado** (`fatura_tratada.csv`) com a base normalizada: `Data`, `Lançamento`, `Estabelecimento`, `Categoria`, `Tipo`, `Natureza`, `Fonte`, `TipoFluxo`, `ValorOriginal`, `ValorAnalise`, `ValorFluxo`, `AnoMes`, `DiaSemana`, `Semana`, `FaixaValor`, `FimDeSemana`.

Em `/transacoes`, o CSV exportado respeita os filtros ativos (`fatura_tratada_filtrada.csv`).

---

## Atalhos de teclado

| Tecla | Onde | Ação |
|-------|------|------|
| `n` / `N` | Global | Abre Quick Add em modo Gasto (ignorado em inputs) |
| `r` / `R` | Global | Abre Quick Add em modo Receita (ignorado em inputs) |
| `s` / `S` | Global | Abre simulador "Posso comprar isso?" (ignorado em inputs) |
| `?` (Shift+/) | Global | Abre simulador "Posso comprar isso?" (ignorado em inputs) |
| `Esc` | Modais e drawers | Fecha |
| `Enter` | Quick Add (valor), editores de padrões/apelidos | Salva / adiciona |
| `Enter` / `Space` | Dropzone | Abre seletor de arquivo |

---

## Persistência

Tudo via IndexedDB usando `idb-keyval`. Chaves (`src/lib/storage.ts`):

No onboarding (passo **Bem-vindo**), o app chama `navigator.storage.persist()` para pedir ao navegador armazenamento **persistente**, reduzindo o risco de limpeza automática por falta de espaço. Isso não impede limpeza manual de dados do site. Em **Config → Backup**, há status da proteção local e botão para solicitar novamente se o navegador ainda estiver em modo *best-effort*.

| Chave | Conteúdo |
|-------|----------|
| `pf:dataset:v2` | Dataset multi-fonte (CSV importados) |
| `pf:rules:v1` | Regras de classificação |
| `pf:recurring:v1` | Despesas fixas e receitas recorrentes |
| `pf:settings:v1` | Configurações, horizonte, view do saldo, reserva para poupar, conquistas |
| `pf:edits:v1` | Edições e exclusões lógicas |
| `pf:installment-group-edits:v1` | Edições/exclusões de grupos parcelados |
| `pf:accounts:v1` | Contas |
| `pf:manual:v1` | Transações manuais (Quick Add) |
| `pf:budgets:v1` | Orçamentos por categoria |
| `pf:subscriptionDismissals:v1` | Assinaturas dispensadas |
| `pf:aliases:v1` | Apelidos de estabelecimento |
| `pf:structuralCategories:v1` | Categorias CSV marcadas como estruturais (Divisor de Águas) |
| `pf:achievements:v1` | Conquistas desbloqueadas |
| `pf:monthClose:v1` | Fechamentos de mês |
| `pf:payment-status:v1` | Status pago/a pagar por transação |
| `pf:lastBackup:v1` | Timestamp do último backup |
| `pf:cloudSync:v1` | Configuração de sync na nuvem (provedor, tokens OAuth, revisão remota) |
| `pf:cloudSyncKeyWrap:v1` | Chave de criptografia wrapped para “lembrar neste dispositivo” |

Para limpar tudo: `/config?tab=importar` → "Limpar dados".

### Sincronização criptografada (E2EE Cloud Sync)

Opcional em **Config → Sync** (`/config?tab=sincronizacao`):

- Backup JSON v9 criptografado com **AES-256-GCM** + **PBKDF2** (600k iterações) antes de sair do browser.
- Senha definida pelo usuário — o Saldo Real **nunca** recebe nem armazena essa senha em texto claro.
- Provedores suportados: **Google Drive** (pasta oculta `appDataFolder`) e **Dropbox** (App Folder).
- Sync automático ~45s após alterações locais; conflitos exigem resolução explícita (sem sobrescrita silenciosa).
- **iCloud:** sem API web — use backup JSON manual na pasta iCloud Drive no iPhone/Mac.

Variáveis de ambiente (OAuth):

| Variável | Onde | Uso |
|----------|------|-----|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | client + server | OAuth Google Drive (`drive.appdata`) |
| `GOOGLE_CLIENT_SECRET` | **server only** | troca do code/refresh no Google (rota `/api/oauth/google/token`) |
| `NEXT_PUBLIC_DROPBOX_APP_KEY` | client | OAuth Dropbox App Folder |
| `NEXT_PUBLIC_SITE_URL` | server (opcional) | origin canônico; também gera par www/apex na allowlist OAuth |
| `OAUTH_ALLOWED_ORIGINS` | server (opcional) | origens extras, separadas por vírgula (ex.: `.dev.br` + `.app`) |

**Redirect URI:** o browser usa `{origin atual}/config/oauth/callback` (ex.: se o usuário acessa `https://www.saldoreal.dev.br`, o redirect é esse domínio). Três lugares devem coincidir:

1. **Google Cloud Console** → Redirect URIs autorizados
2. **Allowlist server-side** → `NEXT_PUBLIC_SITE_URL` e/ou `OAUTH_ALLOWED_ORIGINS`
3. **URL que o usuário abre** no navegador

Erro **"redirect_uri não autorizado."** = validação do Saldo Real (`/api/oauth/google/token`). Erro do Google costuma ser `redirect_uri_mismatch`.

**Google Cloud Console:** credencial OAuth tipo **Web application**. Redirect URIs autorizados:

- `http://localhost:3000/config/oauth/callback` (dev)
- `https://<seu-dominio>/config/oauth/callback` (prod — inclua `www` se o site usa `www`)

Exemplo produção (`www.saldoreal.dev.br`):

```bash
NEXT_PUBLIC_SITE_URL=https://www.saldoreal.dev.br
OAUTH_ALLOWED_ORIGINS=https://www.saldoreal.dev.br,https://saldoreal.dev.br,https://saldoreal.app
```

Copie o **Client ID** para `NEXT_PUBLIC_GOOGLE_CLIENT_ID` e o **Client secret** para `GOOGLE_CLIENT_SECRET` (nunca use prefixo `NEXT_PUBLIC_` no secret).

Dropbox: redirect URI `https://<seu-dominio>/config/oauth/callback`

Implementação: [`src/lib/crypto/e2ee.ts`](src/lib/crypto/e2ee.ts), [`src/lib/cloud-sync/`](src/lib/cloud-sync/), [`src/components/CloudSyncPanel.tsx`](src/components/CloudSyncPanel.tsx).

---

## UI e tema

- Header sticky com logo Saldo Real, navegação principal, widgets (setup, orçamento, backup) e chip de contagem de fontes/linhas.
- **Bottom tab bar** no mobile (`BottomTabBar`) com Hoje, Extrato, Futuro, Quick Add e sheet Mais.
- `next/image` carrega o logo a partir de `public/logo.png`. Favicon e apple-touch-icon são gerados pelas convenções do App Router (`src/app/icon.png`, `src/app/apple-icon.png`).
- Open Graph dinâmico em `src/app/opengraph-image.tsx` com logo + wordmark sobre fundo creme.
- Dark mode automático via `prefers-color-scheme`. Tokens em `src/styles/theme.css`.
- `themeColor` da barra do navegador no mobile: `#f6f3ec` (light) / `#13110c` (dark).
- Glossário contextual (`src/lib/glossary.ts`) em tooltips de termos financeiros.

---

## Privacidade

- Existe uma rota OAuth (`/api/oauth/google/token`) só para trocar tokens do Google Drive com `client_secret` no servidor. **Nenhum dado financeiro em texto claro** (valores, descrições, CSV, backups JSON) é enviado para servidores do app.
- CSV é lido via `File.text()` no navegador e processado client-side.
- Backup gera Blob/ObjectURL no próprio navegador.
- **Sync na nuvem (opcional):** se o usuário conectar Google Drive ou Dropbox, apenas um blob criptografado (`saldoreal-backup.enc`) vai para a conta **dele** — OAuth e upload são client-side; o desenvolvedor não tem a senha de descriptografia.
- Rede adicional esperada: fonte Geist (`next/font/google`), hospedagem (Vercel Analytics agregado) e, **somente se o usuário aceitar no banner LGPD**, Google Analytics 4 para métricas de uso do produto.

### Métricas opcionais (GA4)

- Opt-in explícito na primeira visita; pode ser alterado em **Config → Privacidade** (`/config?tab=privacidade`).
- Variável de ambiente: `NEXT_PUBLIC_GA_MEASUREMENT_ID` (sem valor = GA4 desligado em todos os ambientes).
- Modo cookieless (`client_storage: 'none'`, IP anonimizado); sem Google Signals nem ads.
- Eventos permitidos: onboarding, import CSV (sem conteúdo), backup (versão/resultado), sync na nuvem (provedor/resultado, sem conteúdo), orçamentos, fechamento de mês, conquistas (IDs internos), quick add (tipo), consentimento. Ver [`src/lib/analytics.ts`](src/lib/analytics.ts).
- O rodapé indica quando métricas anônimas estão ativas, com link para gerenciar.

---

## Estrutura do projeto

```
src/
  app/
    (app)/           # rotas autenticadas pelo setup (AppShell, dados locais)
      comecar/       # onboarding
      saldo/         # Hoje
      extrato/       # extrato de contas
      faturas/       # faturas de cartão
      futuro/        # projeção e timeline
      divisor/       # Divisor de Águas
      dashboard/     # análise histórica
      recorrentes/
      transacoes/
      config/
      regras/        # redirect legado
    (marketing)/     # landing, guias, artigos, ferramentas públicas
    layout.tsx       # root layout + metadata
    manifest.ts      # PWA
    sitemap.ts
    opengraph-image.tsx
    icon.png
    apple-icon.png
  components/        # AppShell, NavBar, BottomTabBar, QuickAdd*, painel/*, marketing/*, charts/...
  content/           # artigos TSX
  lib/
    accounts.ts      # contas + âncora de saldo
    aggregations.ts  # KPIs, séries, insights, hábitos
    achievements.ts  # conquistas
    afford.ts        # simulador "Posso comprar isso?"
    alerts.ts        # alertas do painel Hoje
    analytics.ts     # GA4 (opt-in)
    backup.ts        # export/import V1–V9
    crypto/          # E2EE (AES-GCM + PBKDF2)
    cloud-sync/      # OAuth PKCE, Google Drive, Dropbox, orchestrator
    budgets.ts       # orçamentos e alertas
    cardLimits.ts    # teto mensal por cartão
    csv.ts           # parse Inter/Nubank
    dailyAllowance.ts # limite diário + reserva
    edits.ts         # edição/exclusão lógica
    exporters.ts     # CSV e Excel
    filters.ts       # filtros + presets de data
    installments.ts  # parcelamento no Quick Add
    leverage.ts      # alavancagem fixo vs renda (Divisor de Águas)
    marketing/       # copy, artigos, site, social
    monthClose.ts    # fechamento de mês
    normalize.ts     # natureza, valorAnalise, fluxo
    paymentStatus.ts # pago / a pagar no extrato
    projection.ts    # saldo projetado
    recurring.ts     # expansão de regras
    savings.ts       # reserva para poupar
    storage.ts       # IndexedDB
    storagePersistence.ts  # navigator.storage.persist()
    store.tsx        # AppStoreProvider (estado global)
    subscriptions.ts # detecção de assinaturas
    transactionViews.ts # agrupamentos extrato/faturas
    types.ts         # tipos compartilhados
    wealth.ts        # projeção patrimonial (Paz Futura)
  styles/
    theme.css        # tokens (cores, radii)
    index.css        # base global
public/
  logo.png
  pwa/               # ícones PWA (192, 512, maskable)
```
