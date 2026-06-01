# Saldo Real

Painel financeiro pessoal **local e privado**. Importa faturas de cartão, agrega gastos manuais, contas e despesas fixas em uma visão única; projeta o saldo dos próximos meses; alerta sobre orçamentos estourados e sugere transformar assinaturas detectadas em despesas recorrentes.

Tudo roda no navegador — sem backend, sem upload, sem cadastro. Os dados ficam no IndexedDB do próprio dispositivo e podem ser exportados/restaurados via backup JSON a qualquer momento.

---

## Princípios

- **Local-first.** Nenhuma transação sai do navegador. Não há rotas de API.
- **Sem cadastro.** Abra, importe um CSV e use.
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
- **Geist** (sans + mono) via `next/font/google`

---

## Início rápido

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Na primeira vez, o onboarding leva você por:

1. Importar um CSV (Inter ou Nubank).
2. Cadastrar contas (conta corrente, poupança, carteira, cartão).
3. (Opcional) **Divisor de Águas** — separar renda, custos fixos estruturais e categorias do CSV marcadas como estruturais.

Depois disso, o app redireciona automaticamente para `/saldo` ou `/dashboard`.

Build de produção:

```bash
npm run build
npm start
```

---

## Páginas

| Rota | O que faz |
|------|-----------|
| `/` | Onboarding; redireciona para `/saldo` ou `/dashboard` depois do setup |
| `/saldo` | Saldo atual + projeção 30/60/90/180 dias com gráfico, calendário e timeline de eventos |
| `/dashboard` | Análise histórica com tabs `geral`, `comparar`, `orcamentos`, `cartao`, `habitos`, `categorias`, `estabelecimentos` |
| `/recorrentes` | CRUD de despesas fixas e receitas + painel de assinaturas detectadas automaticamente |
| `/transacoes` | Tabela detalhada com filtros, busca, ordenação, edição, exclusão lógica e auto-categorização |
| `/config` | Configurações em tabs `importar`, `classificacao`, `apelidos`, `contas`, `backup`, `orcamentos` |
| `/regras` | Atalho legado que redireciona para `/config?tab=classificacao` |

Várias páginas suportam deep link por query string (`?tab=...`), usado pelos widgets do header.

---

## Importação de CSV

Os formatos são detectados automaticamente pelos cabeçalhos.

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
- Opcionais: `isDefault`, `fonteCsv`, `diaFechamento`, `diaPagamento`.

Em `/config?tab=contas` você cria, edita, ativa/desativa, marca conta padrão e ajusta o horizonte de projeção (30, 60, 90 ou 180 dias). Contas não-cartão formam a âncora do saldo atual; contas cartão vinculam o CSV de fatura e definem fechamento/pagamento para projetar quando a fatura sai do saldo.

### Ajustar saldo

Em `/saldo`, o modal de ajuste permite duas estratégias:

- **Lançamento de ajuste** — cria uma transação manual que corrige a diferença sem mexer no histórico.
- **Atualizar saldo inicial** — define o novo saldo como referência para hoje.

---

## Quick Add

Modal de lançamento rápido acessível pelo botão flutuante (FAB), pelo atalho **`n`** (gasto) ou **`r`** (receita).

- **Seletor no topo**: alterne entre **Gasto** e **Receita**; título, subtítulo, placeholders, sugestões e botão primário adaptam ao modo.
- Campos: valor, descrição, categoria, conta e data (com "Hoje" e "Ontem").
- **Gasto**: sugere estabelecimentos do histórico; avisa orçamento (uso atual e impacto projetado) **antes** de salvar — sem bloquear.
- **Receita**: sugere descrições e categorias de entradas anteriores (ou padrões como Salário, Freela); mostra prévia de quanto o saldo aumenta na conta e data escolhidas.
- "Salvar e adicionar outro/outra" mantém o modal aberto no mesmo modo para registrar uma sequência.
- Em `/transacoes`, qualquer transação pode ser "repetida", abrindo o Quick Add já preenchido.

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

Opcionalmente, "Registrar gasto com esses dados" abre o Quick Add já preenchido.

---

## Recorrentes

Em `/recorrentes`, cadastre regras mensais para despesas fixas (aluguel, boletos) e receitas (salário, aluguéis recebidos).

Modelo `RecurringRule` (`src/lib/recurring.ts`):

- `id`, `kind` (`despesa_fixa` | `receita`), `descricao`, `categoria`, `valor`, `diaMes`, `inicio`, `fim`, `ativo`, `accountId?`.

O sistema **expande** cada regra em transações sintéticas mensais até hoje, com IDs no padrão `manual:${ruleId}:${anoMes}`. Essas transações entram no dashboard como qualquer outra, mas não podem ser editadas na tabela — só na própria regra. `diaMes` é automaticamente ajustado ao último dia válido em meses curtos.

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

## Projeção de saldo

`/saldo` é a tela principal para a pergunta "dá pra gastar isso agora?".

Calculada em `src/lib/projection.ts`, a projeção parte da âncora (soma dos saldos iniciais ativos não-cartão) e adiciona/subtrai eventos diários:

- **Faturas de cartão** agrupadas pela data de pagamento, respeitando `diaFechamento` e `diaPagamento` de cada cartão.
- **Despesas fixas e receitas recorrentes** dentro do horizonte.

A página mostra:

- Saldo atual + snapshots em 7, 30 e 90 dias.
- Menor saldo no horizonte e a data em que ele ocorre.
- Próxima fatura prevista.
- Gráfico de linha (`BalanceProjectionChart`) **ou** calendário mensal com eventos (`SaldoCalendarView`) — alternável.
- Timeline de receitas e despesas futuras com filtros.
- **Projeção de Paz Futura** (`WealthProjectionPanel`): evolução patrimonial em 12 meses com slider de meta de poupança (5–80% da renda disponível) e tradução em meses de tranquilidade financeira.

### Projeção de Paz Futura

Calculada em `src/lib/wealth.ts`, reutilizando o Divisor de Águas (`src/lib/leverage.ts`):

- **Renda disponível** = receitas recorrentes − custos fixos.
- **Patrimônio inicial** = soma dos saldos das contas ativas não-cartão.
- **Aporte mensal** = renda disponível × meta (%).
- **Patrimônio projetado** = patrimônio inicial + aportes acumulados (sem juros no MVP).
- **Meses de tranquilidade** = patrimônio ÷ custo fixo mensal.

Exemplo de copy: *"Mantendo sua meta de 20%, em dez/26 seu patrimônio terá crescido R$ X, te garantindo Y meses de tranquilidade financeira."*

### Saldo diário disponível

Calculado em `src/lib/dailyAllowance.ts`:

- **Renda disponível** = receitas recorrentes − custos fixos
- **Sobra do mês** = renda disponível − gasto variável já feito − fatura aberta do cartão
- **Saldo diário** = sobra do mês ÷ dias restantes do mês
- **Teto recomendado do cartão** = renda disponível mensal

Aparece no Painel (`/saldo`), entre saldo atual e contas.

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

## Filtros, edição e exclusão

O drawer de filtros (`FiltersDrawer`) cobre:

- Data inicial/final (com presets: tudo, últimos 7/30/90, mês atual, mês anterior, YTD)
- Categorias, naturezas, faixas de valor
- Busca por lançamento, estabelecimento e categoria

Os filtros são aplicados em memória e compartilhados entre `/dashboard` e `/transacoes` via `FiltersProvider`.

`TransactionEdit` (`src/lib/edits.ts`) permite alterar `data`, `lancamento`, `categoria`, `tipo` e `valorOriginal` sem modificar o CSV original. Exclusão é lógica (`deleted: true`) e pode ser restaurada. Transações manuais do Quick Add são editadas/removidas diretamente. Transações sintéticas de recorrentes só podem ser alteradas via `/recorrentes`.

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

No onboarding (passo 3), o app ajuda a separar o que é **difícil de mudar** (custos fixos estruturais) do que é **gerenciável** no dia a dia (variáveis no cartão).

- **Renda total**: soma das receitas recorrentes ativas (`RecurringRule kind="receita"`).
- **Custo fixo**: despesas fixas recorrentes ativas + categorias do CSV que você marcar manualmente como estruturais.
- **CSV estrutural**: mediana de gasto nos últimos 3 meses fechados por categoria marcada.
- **Anti-dupla-contagem**: se uma categoria já tem despesa fixa recorrente, o CSV dessa categoria não entra de novo.

**Alerta de alavancagem**: se os custos fixos passarem de **50%** da renda cadastrada, o app exibe:

> Seu custo de vida fixo está muito alto para a sua renda atual. Para se reestruturar rápido, avalie negociar esses contratos ou reduzir a estrutura.

Bandas graduadas: saudável (&lt;30%), atenta (30–50%), alta (50–70%), crítica (≥70%).

---

## Backup completo

`src/lib/backup.ts` exporta um JSON único com tudo: dataset, regras, recorrentes, configurações, edições, contas, transações manuais, orçamentos, dispensas de assinaturas, apelidos de estabelecimento e categorias estruturais do Divisor de Águas.

- Versão atual: **V5**. Backups V1–V4 ainda são importáveis (campos novos vêm vazios).
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

| Chave | Conteúdo |
|-------|----------|
| `pf:dataset:v2` | Dataset multi-fonte (CSV importados) |
| `pf:rules:v1` | Regras de classificação |
| `pf:recurring:v1` | Despesas fixas e receitas recorrentes |
| `pf:settings:v1` | Configurações, horizonte, view do saldo |
| `pf:edits:v1` | Edições e exclusões lógicas |
| `pf:accounts:v1` | Contas |
| `pf:manual:v1` | Transações manuais (Quick Add) |
| `pf:budgets:v1` | Orçamentos por categoria |
| `pf:subscriptionDismissals:v1` | Assinaturas dispensadas |
| `pf:aliases:v1` | Apelidos de estabelecimento |
| `pf:structuralCategories:v1` | Categorias CSV marcadas como estruturais (Divisor de Águas) |
| `pf:lastBackup:v1` | Timestamp do último backup |

Para limpar tudo: `/config?tab=importar` → "Limpar dados".

---

## UI e tema

- Header sticky com logo Saldo Real, navegação, widgets (setup, orçamento, backup) e chip de contagem de fontes/linhas.
- `next/image` carrega o logo a partir de `public/logo.png`. Favicon e apple-touch-icon são gerados pelas convenções do App Router (`src/app/icon.png`, `src/app/apple-icon.png`).
- Open Graph dinâmico em `src/app/opengraph-image.tsx` com logo + wordmark sobre fundo creme.
- Dark mode automático via `prefers-color-scheme`. Tokens em `src/styles/theme.css`.
- `themeColor` da barra do navegador no mobile: `#f6f3ec` (light) / `#13110c` (dark).

---

## Privacidade

- Não há rotas de API. Nenhum dado financeiro é enviado para servidores.
- CSV é lido via `File.text()` no navegador e processado client-side.
- Backup gera Blob/ObjectURL no próprio navegador.
- A única rede esperada é o carregamento da fonte Geist em build/dev (via `next/font/google`).

O rodapé do app afirma: *Dados processados no navegador. Nada é enviado para servidores.*

---

## Estrutura do projeto

```
src/
  app/
    config/          # /config e tabs internas
    dashboard/       # /dashboard com tabs
    recorrentes/     # /recorrentes + assinaturas
    saldo/           # /saldo projetado
    transacoes/      # /transacoes
    layout.tsx       # AppShell + providers + metadata
    opengraph-image.tsx
    icon.png         # favicon (App Router auto-detect)
    apple-icon.png
  components/        # UI: AppShell, NavBar, QuickAdd*, Backup*, Budgets*, Subscriptions*, charts/...
  lib/
    accounts.ts      # contas + âncora de saldo
    aggregations.ts  # KPIs, séries, insights, hábitos
    backup.ts        # export/import V1-V5
    leverage.ts      # alavancagem fixo vs renda (Divisor de Águas)
    budgets.ts       # orçamentos e alertas
    csv.ts           # parse Inter/Nubank
    edits.ts         # edição/exclusão lógica
    exporters.ts     # CSV e Excel
    filters.ts       # filtros + presets de data
    normalize.ts     # natureza, valorAnalise, fluxo
    projection.ts    # saldo diário projetado
    dailyAllowance.ts # saldo disponível por dia + teto cartão
    afford.ts        # simulador "Posso comprar isso?"
    wealth.ts        # projeção patrimonial (Paz Futura)
    recurring.ts     # expansão de regras
    storage.ts       # IndexedDB
    store.tsx        # AppStoreProvider (estado global)
    subscriptions.ts # detecção de assinaturas
    types.ts         # tipos compartilhados
  styles/
    theme.css        # tokens (cores, radii)
    index.css        # base global
public/
  logo.png           # logo Saldo Real (1024)
  logo-64.png        # variação retina opcional
  logo-192.png       # PWA futuro
```
