# Eng handoff — Setup guiado de orçamentos

## Resumo

Implementação do PRD v1: sugestões locais de orçamento por categoria a partir dos últimos 3 meses completos de saídas.

## Arquivos principais

| Arquivo | Responsabilidade |
|---------|------------------|
| [`src/lib/budgets.ts`](../../src/lib/budgets.ts) | `suggestBudgetsFromHistory`, `canShowBudgetSuggestions`, `budgetCategoryKey`, arredondamento, outliers |
| [`src/lib/budgets.test.ts`](../../src/lib/budgets.test.ts) | Testes Vitest |
| [`src/lib/store.tsx`](../../src/lib/store.tsx) | Dedup `addBudget` / `updateBudget` via `budgetCategoryKey` |
| [`src/components/BudgetSuggestionsDrawer.tsx`](../../src/components/BudgetSuggestionsDrawer.tsx) | Drawer de sugestões + criação em lote |
| [`src/components/BudgetsEmptyState.tsx`](../../src/components/BudgetsEmptyState.tsx) | Empty state com CTAs |
| [`src/components/BudgetsPanel.tsx`](../../src/components/BudgetsPanel.tsx) | Integração Config |
| [`src/app/dashboard/page.tsx`](../../src/app/dashboard/page.tsx) | Integração Dashboard |

## Comandos

```bash
npm install
npm test          # vitest
npm run build     # regressão Next
```

## Regras de negócio (referência rápida)

- Janela: 3 meses completos UTC, mês corrente excluído  
- Elegibilidade categoria: ≥3 transações de saída em pelo menos 1 mês da janela com gasto &gt; 0  
- Valor: mediana mensal (outliers &gt;2× mediana removidos) → `roundBudgetSuggestion`  
- UI: top 5 + toggle +5; exclui categorias com orçamento **ativo**  
- Fallback drawer: &lt;30 dias de saídas **ou** &lt;3 categorias elegíveis  

## QA manual

1. Perfil sem dados → sem botão "Sugerir"; só manual  
2. Perfil 90+ dias, zero orçamentos → drawer com ≥3 linhas; criar 2; toast + link Dashboard  
3. Categoria duplicada por acento (`Alimentação` vs `alimentacao`) → erro ao criar manual ou skip na batch  
4. Offline: abrir drawer e criar (dados já carregados)  

## Próximos incrementos (não neste ticket)

- CTA "Sugerir mais" quando já existem orçamentos ativos  
- Revisão de fim de mês  
- Integração com Quick Add para categoria sem orçamento
