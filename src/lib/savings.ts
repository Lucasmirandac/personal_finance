import {
  WEALTH_META_DEFAULT,
  WEALTH_META_MAX,
  WEALTH_META_MIN,
} from "./wealth";
import { SavingsMode, SavingsPreference } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clampPercent(value: number): number {
  return Math.min(WEALTH_META_MAX, Math.max(WEALTH_META_MIN, value));
}

export type ResolvedAporte = {
  aporteMensal: number;
  modo: SavingsMode | null;
  percentualEfetivo: number | null;
};

export function mergeSavingsPreference(v: unknown): SavingsPreference | null {
  if (v == null) return null;
  if (typeof v !== "object") return null;
  const o = v as Partial<SavingsPreference>;
  if (o.modo !== "percent" && o.modo !== "fixed") return null;

  if (o.modo === "percent") {
    const raw =
      typeof o.percentual === "number" && Number.isFinite(o.percentual)
        ? o.percentual
        : WEALTH_META_DEFAULT;
    return { modo: "percent", percentual: clampPercent(raw) };
  }

  const valor =
    typeof o.valorMensal === "number" &&
    Number.isFinite(o.valorMensal) &&
    o.valorMensal > 0
      ? round2(o.valorMensal)
      : null;
  if (!valor) return null;
  return { modo: "fixed", valorMensal: valor };
}

export function resolveAporteMensal(
  rendaDisponivel: number,
  pref: SavingsPreference | null | undefined,
): ResolvedAporte {
  if (!pref || rendaDisponivel <= 0) {
    return { aporteMensal: 0, modo: null, percentualEfetivo: null };
  }

  if (pref.modo === "percent") {
    const percentual = clampPercent(pref.percentual ?? WEALTH_META_DEFAULT);
    const aporteMensal = round2((rendaDisponivel * percentual) / 100);
    return { aporteMensal, modo: "percent", percentualEfetivo: percentual };
  }

  const valorMensal = pref.valorMensal ?? 0;
  if (valorMensal <= 0) {
    return { aporteMensal: 0, modo: null, percentualEfetivo: null };
  }

  const aporteMensal = round2(Math.min(valorMensal, rendaDisponivel));
  const percentualEfetivo =
    rendaDisponivel > 0
      ? round2((aporteMensal / rendaDisponivel) * 100)
      : null;

  return { aporteMensal, modo: "fixed", percentualEfetivo };
}

export function effectiveMetaPercent(
  rendaDisponivel: number,
  pref: SavingsPreference | null | undefined,
): number {
  const resolved = resolveAporteMensal(rendaDisponivel, pref);
  if (resolved.modo === "percent" && resolved.percentualEfetivo != null) {
    return resolved.percentualEfetivo;
  }
  if (
    resolved.modo === "fixed" &&
    resolved.percentualEfetivo != null &&
    rendaDisponivel > 0
  ) {
    return clampPercent(resolved.percentualEfetivo);
  }
  return WEALTH_META_DEFAULT;
}
