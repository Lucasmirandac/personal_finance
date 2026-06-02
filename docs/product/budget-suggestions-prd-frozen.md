# PRD congelado — Setup guiado do primeiro orçamento (v1)

**Status:** implementado · **Data:** 2026-06-01  
**Decisões:** [budget-suggestions-decisions.md](./budget-suggestions-decisions.md)

## Escopo entregue (v1)

- `suggestBudgetsFromHistory` + helpers em [`src/lib/budgets.ts`](../../src/lib/budgets.ts)
- Testes unitários em [`src/lib/budgets.test.ts`](../../src/lib/budgets.test.ts) (`npm test`)
- Dedup de categoria case+acento no store
- `BudgetSuggestionsDrawer` + `BudgetsEmptyState`
- CTAs nos empty states de Config e Dashboard
- Criação em lote com falha parcial + toast com link ao Dashboard

## Fora do escopo (inalterado)

Rollover, thresholds customizáveis, notificações push, histórico mensal, integração com `/futuro`/`/saldo`, telemetria remota.

## Métricas de sucesso (validação manual)

Ver [budget-suggestions-qual-script.md](../validation/budget-suggestions-qual-script.md).
