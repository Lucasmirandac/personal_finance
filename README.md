# Dashboard de Gastos por CSV

App Next.js local e privado para análise de faturas em CSV, sem backend e sem upload para servidores. Todo o processamento, persistência e exportação acontece no próprio navegador.

## Stack

- Next.js (App Router) + React 19 + TypeScript
- Tailwind CSS 4 (cores e tokens próprios)
- PapaParse (CSV)
- Zod (validação)
- Recharts (gráficos)
- @tanstack/react-table (tabela detalhada)
- xlsx (exportação .xlsx multi-aba)
- idb-keyval (persistência local em IndexedDB)

## Formato do CSV esperado

Colunas obrigatórias (cabeçalho na primeira linha):

```
"Data","Lançamento","Categoria","Tipo","Valor"
"25/05/2026","DL*UberRides","TRANSPORTE","Compra à vista","R$ 20,10"
```

- `Data` no formato `dd/mm/yyyy`.
- `Valor` em formato BRL: `R$ 1.234,56`. Aceita negativos: `-R$ 10,00`, `R$ -10,00`, `(R$ 10,00)`.

## Classificação automática

Cada lançamento recebe uma `natureza`:

- `Gasto`: consumo de fato. `valorAnalise = valorOriginal`.
- `Pagamento de fatura`: o lançamento bate com algum padrão da regra de pagamento. `valorAnalise = 0`.
- `Estorno / crédito`: valor negativo OU lançamento bate com algum padrão de estorno. `valorAnalise = 0`.

Padrões padrão (editáveis em `/regras`):

- **Pagamento**: `PAGAMENTO ON LINE`, `PAGTO DEBITO AUTOMATICO`, `PAGAMENTO DE FATURA`, `PAG FATURA`.
- **Estorno/crédito**: `ESTORNO`, `CREDITO`, `CRÉDITO`, `DEVOLU`, `CANCELAMENTO`, `REEMBOLSO`.

A comparação é case-insensitive e sem acentos.

## Páginas

- `/` — Importação com dropzone, validação e estatísticas rápidas.
- `/dashboard` — KPIs, evolução mensal, categorias, dia da semana, rankings e insights.
- `/transacoes` — Tabela detalhada com filtros, busca, ordenação e exportação da visão filtrada.
- `/regras` — Edição dos padrões de classificação com pré-visualização do impacto.

## Exportações

- **Excel (.xlsx)**: workbook com as abas `Dashboard`, `Dados`, `Resumo_Mensal`, `Resumo_Categorias`, `Estabelecimentos`, `Insights`.
- **CSV tratado**: base normalizada com `valorOriginal`, `valorAnalise`, `natureza` e campos derivados (`AnoMes`, `DiaSemana`, `Semana`, `FaixaValor`, `FimDeSemana`).

## Persistência

- O dataset e as regras ficam salvos localmente via IndexedDB (`idb-keyval`).
- Para limpar e voltar ao estado inicial, use o botão "Limpar dados" na página de importação.

## Desenvolvimento

```bash
npm install
npm run dev
```

App em `http://localhost:3000`.

```bash
npm run build
npm start
```

## Notas

- App em português, uso pessoal local.
- Nenhuma rota de API; nada é enviado a servidores.
- Pode rodar 100% em `localhost`.
