import { isRecurringRaw } from "./edits";
import { SEM_CATEGORIA } from "./normalize";
import { Rules, TransactionNormalized } from "./types";

export type CategorySuggestion = {
  rawId: string;
  estabelecimento: string;
  currentCategoria: string;
  suggestion: string;
  votes: number;
  support: number;
};

type CategoryVote = {
  categoria: string;
  votes: number;
  lastSeenISO: string;
};

type EstablishmentProfile = {
  categories: Map<string, CategoryVote>;
  support: number;
};

function normalizeCategoryKey(cat: string): string {
  return cat.trim().toLowerCase();
}

export function isGenericCategoria(cat: string, rules: Rules): boolean {
  const trimmed = cat.trim();
  if (trimmed === "" || trimmed === SEM_CATEGORIA) return true;
  const key = normalizeCategoryKey(trimmed);
  return rules.genericCategorias.some(
    (g) => normalizeCategoryKey(g) === key,
  );
}

function isExcludedFromVoting(t: TransactionNormalized): boolean {
  return (
    t.natureza === "Pagamento de fatura" || t.natureza === "Estorno / crédito"
  );
}

function pickWinner(profile: EstablishmentProfile): CategoryVote | null {
  let best: CategoryVote | null = null;
  for (const vote of profile.categories.values()) {
    if (!best) {
      best = vote;
      continue;
    }
    if (vote.votes > best.votes) {
      best = vote;
      continue;
    }
    if (vote.votes === best.votes && vote.lastSeenISO > best.lastSeenISO) {
      best = vote;
    }
  }
  return best;
}

export function buildAutoCategorySuggestions(
  data: TransactionNormalized[],
  rules: Rules,
): CategorySuggestion[] {
  const profiles = new Map<string, EstablishmentProfile>();

  for (const t of data) {
    if (isExcludedFromVoting(t)) continue;
    if (isGenericCategoria(t.categoria, rules)) continue;

    const estab = t.estabelecimento;
    let profile = profiles.get(estab);
    if (!profile) {
      profile = { categories: new Map(), support: 0 };
      profiles.set(estab, profile);
    }

    profile.support += 1;
    const cat = t.categoria.trim();
    const key = normalizeCategoryKey(cat);
    const existing = profile.categories.get(key);
    if (existing) {
      existing.votes += 1;
      if (t.dataISO > existing.lastSeenISO) {
        existing.lastSeenISO = t.dataISO;
      }
    } else {
      profile.categories.set(key, {
        categoria: cat,
        votes: 1,
        lastSeenISO: t.dataISO,
      });
    }
  }

  const suggestions: CategorySuggestion[] = [];

  for (const t of data) {
    if (isRecurringRaw(t)) continue;
    if (isExcludedFromVoting(t)) continue;
    if (!isGenericCategoria(t.categoria, rules)) continue;

    const profile = profiles.get(t.estabelecimento);
    if (!profile || profile.support === 0) continue;

    const winner = pickWinner(profile);
    if (!winner) continue;
    if (normalizeCategoryKey(winner.categoria) === normalizeCategoryKey(t.categoria)) {
      continue;
    }

    suggestions.push({
      rawId: t.id,
      estabelecimento: t.estabelecimento,
      currentCategoria: t.categoria,
      suggestion: winner.categoria,
      votes: winner.votes,
      support: profile.support,
    });
  }

  suggestions.sort((a, b) => {
    const byEst = a.estabelecimento.localeCompare(b.estabelecimento, "pt-BR");
    if (byEst !== 0) return byEst;
    return a.currentCategoria.localeCompare(b.currentCategoria, "pt-BR");
  });

  return suggestions;
}
