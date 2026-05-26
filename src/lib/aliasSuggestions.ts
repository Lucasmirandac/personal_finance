import { compileAliases, normalizePattern } from "./aliases";
import { establishmentAggregation } from "./aggregations";
import { EstablishmentAlias, TransactionNormalized } from "./types";

export type AliasVariant = {
  estabelecimento: string;
  total: number;
  count: number;
};

export type AliasSuggestion = {
  token: string;
  variantes: AliasVariant[];
  totalGasto: number;
};

const MIN_TOKEN_LEN = 3;
const MIN_LCS_LEN = 4;

function tokenize(estabelecimento: string): string[] {
  return estabelecimento
    .split(/[\s*\-_/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= MIN_TOKEN_LEN && !/^\d+$/.test(t));
}

function longestCommonSubstring(a: string, b: string): string {
  const x = normalizePattern(a);
  const y = normalizePattern(b);
  if (!x || !y) return "";
  let best = "";
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < y.length; j++) {
      let len = 0;
      while (
        i + len < x.length &&
        j + len < y.length &&
        x[i + len] === y[j + len]
      ) {
        len++;
      }
      if (len > best.length) {
        best = x.slice(i, i + len);
      }
    }
  }
  return best;
}

function pickAnchorToken(variantes: AliasVariant[]): string {
  const tokenCounts = new Map<string, number>();
  for (const v of variantes) {
    for (const token of tokenize(v.estabelecimento)) {
      const norm = normalizePattern(token);
      tokenCounts.set(norm, (tokenCounts.get(norm) ?? 0) + 1);
    }
  }

  let bestToken = "";
  let bestScore = 0;
  for (const [token, count] of tokenCounts) {
    const score = count * 100 + token.length;
    if (score > bestScore || (score === bestScore && token.length > bestToken.length)) {
      bestToken = token;
      bestScore = score;
    }
  }

  if (bestToken) return bestToken;

  let bestLcs = "";
  for (let i = 0; i < variantes.length; i++) {
    for (let j = i + 1; j < variantes.length; j++) {
      const lcs = longestCommonSubstring(
        variantes[i].estabelecimento,
        variantes[j].estabelecimento,
      );
      if (lcs.length >= MIN_LCS_LEN && lcs.length > bestLcs.length) {
        bestLcs = lcs;
      }
    }
  }
  return bestLcs;
}

export function formatSuggestionCanonical(token: string): string {
  const t = token.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function isAlreadyAliased(
  estabelecimento: string,
  lancamento: string,
  compiled: ReturnType<typeof compileAliases>,
): boolean {
  const estNorm = normalizePattern(estabelecimento);
  const lancNorm = normalizePattern(lancamento);
  for (const entry of compiled) {
    if (
      estNorm.includes(entry.patternNorm) ||
      lancNorm.includes(entry.patternNorm)
    ) {
      return true;
    }
  }
  return false;
}

export function buildAliasSuggestions(
  normalized: TransactionNormalized[],
  aliases: EstablishmentAlias[],
  options?: { limit?: number },
): AliasSuggestion[] {
  const limit = options?.limit ?? 10;
  const compiled = compileAliases(aliases);

  const aggs = establishmentAggregation(normalized);
  const unaliased = aggs.filter((a) => {
    const sample = normalized.find((t) => t.estabelecimento === a.estabelecimento);
    if (!sample) return true;
    return !isAlreadyAliased(a.estabelecimento, sample.lancamento, compiled);
  });

  const tokenToVariants = new Map<string, Map<string, AliasVariant>>();

  for (const agg of unaliased) {
    const tokens = tokenize(agg.estabelecimento);
    for (const token of tokens) {
      const key = normalizePattern(token);
      if (key.length < MIN_TOKEN_LEN) continue;
      let group = tokenToVariants.get(key);
      if (!group) {
        group = new Map();
        tokenToVariants.set(key, group);
      }
      group.set(agg.estabelecimento, {
        estabelecimento: agg.estabelecimento,
        total: agg.total,
        count: agg.count,
      });
    }
  }

  const suggestions: AliasSuggestion[] = [];

  for (const [token, variantMap] of tokenToVariants) {
    const variantes = [...variantMap.values()];
    if (variantes.length < 2) continue;

    const totalGasto = variantes.reduce((acc, v) => acc + v.total, 0);
    suggestions.push({
      token,
      variantes: variantes.sort((a, b) => b.total - a.total),
      totalGasto,
    });
  }

  suggestions.sort((a, b) => b.totalGasto - a.totalGasto);

  const seen = new Set<string>();
  const deduped: AliasSuggestion[] = [];
  for (const s of suggestions) {
    const variantKey = s.variantes
      .map((v) => v.estabelecimento)
      .sort()
      .join("\0");
    if (seen.has(variantKey)) continue;
    seen.add(variantKey);
    deduped.push({
      ...s,
      token: pickAnchorToken(s.variantes) || s.token,
    });
    if (deduped.length >= limit) break;
  }

  return deduped;
}
