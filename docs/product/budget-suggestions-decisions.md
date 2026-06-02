# Decisões — Setup guiado de orçamentos (v1)

Status: **congelado** em 2026-06-01.

| # | Pergunta | Decisão |
|---|----------|---------|
| 1 | Top N de categorias | **5** iniciais + toggle "Mostrar categorias com gasto menor" para até **+5** |
| 2 | Valor sugerido | **Mediana** mensal (após remoção de outliers), arredondada para cima em múltiplos de R$ 10 (≤ R$ 500) ou R$ 50 (> R$ 500) |
| 3 | Reabertura do drawer | Sugerir **apenas categorias sem orçamento ativo**; não atualizar valor de orçamento existente no v1 |
| 4 | Onde aparece o CTA | **Somente** nos empty states de `/config?tab=orcamentos` e `/dashboard?tab=orcamentos` |

Janela de histórico: últimos **3 meses completos** (UTC), mês corrente excluído.

Fallback: &lt; 30 dias de saídas **ou** &lt; 3 categorias elegíveis após filtros.
