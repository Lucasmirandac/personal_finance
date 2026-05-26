import { EstablishmentAlias } from "./types";

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function normalizePattern(p: string): string {
  return stripDiacritics(p).toUpperCase().trim();
}

export type CompiledAliasEntry = {
  canonical: string;
  patternNorm: string;
};

export type CompiledAliases = CompiledAliasEntry[];

export function compileAliases(aliases: EstablishmentAlias[]): CompiledAliases {
  const out: CompiledAliasEntry[] = [];
  for (const alias of aliases) {
    const canonical = alias.canonical.trim();
    if (!canonical) continue;
    for (const pattern of alias.patterns) {
      const trimmed = pattern.trim();
      if (!trimmed) continue;
      out.push({
        canonical,
        patternNorm: normalizePattern(trimmed),
      });
    }
  }
  return out;
}

function matchesPattern(textNorm: string, patternNorm: string): boolean {
  if (!patternNorm) return false;
  return textNorm.includes(patternNorm);
}

export function resolveAlias(
  estabelecimento: string,
  lancamento: string,
  compiled: CompiledAliases,
): string | null {
  if (compiled.length === 0) return null;

  const estNorm = normalizePattern(estabelecimento);
  for (const entry of compiled) {
    if (matchesPattern(estNorm, entry.patternNorm)) {
      return entry.canonical;
    }
  }

  const lancNorm = normalizePattern(lancamento);
  for (const entry of compiled) {
    if (matchesPattern(lancNorm, entry.patternNorm)) {
      return entry.canonical;
    }
  }

  return null;
}

export function applyAliasToEstabelecimento(
  estabelecimento: string,
  lancamento: string,
  compiled: CompiledAliases,
): string {
  return resolveAlias(estabelecimento, lancamento, compiled) ?? estabelecimento;
}
