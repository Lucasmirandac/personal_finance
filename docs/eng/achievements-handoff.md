# Eng handoff — Conquistas discretas

## Arquivos

| Arquivo | Função |
|---------|--------|
| [`src/lib/achievements.ts`](../../src/lib/achievements.ts) | Catálogo, motor `evaluateAchievements` |
| [`src/lib/achievements.test.ts`](../../src/lib/achievements.test.ts) | Testes Vitest |
| [`src/lib/storage.ts`](../../src/lib/storage.ts) | `pf:achievements:v1` |
| [`src/lib/store.tsx`](../../src/lib/store.tsx) | Avaliação ao carregar + fila de toast |
| [`src/lib/backup.ts`](../../src/lib/backup.ts) | Backup v6 com `achievements` |
| [`src/components/AchievementToastHost.tsx`](../../src/components/AchievementToastHost.tsx) | Toast global |
| [`src/components/AchievementsCard.tsx`](../../src/components/AchievementsCard.tsx) | Card em `/saldo` |
| [`src/components/AchievementsPanel.tsx`](../../src/components/AchievementsPanel.tsx) | Lista em `/config?tab=conquistas` |

## Comandos

```bash
npm test
npm run build
```

## Regras

- Unlock **append-only** — nunca remove conquista ao apagar transação
- `Settings.showAchievements` (default `true`) oculta UI; motor continua gravando
- Sobra: `computeDailyAllowance` no último dia de cada mês fechado (`anoMes < mês atual`)
- `cofrinho-calmo`: soma de sobras positivas ≥ R$ 500 (`COFRINHO_CALMO_THRESHOLD`)
