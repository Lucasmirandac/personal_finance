import { computeDailyAllowance } from "./dailyAllowance";
import { isManualQuickRaw } from "./manualTransactions";
import { currentMonthIso } from "./budgets";
import {
  Account,
  Achievement,
  AchievementId,
  AchievementsSnapshot,
  EMPTY_ACHIEVEMENTS,
  RecurringRule,
  TransactionNormalized,
} from "./types";

export const COFRINHO_CALMO_THRESHOLD = 500;

export type AchievementGroup = "rotina" | "sobra";

export type AchievementDefinition = {
  id: AchievementId;
  title: string;
  description: string;
  group: AchievementGroup;
};

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    id: "primeiro-passo",
    title: "Primeiro passo",
    description: "Registrou seu primeiro gasto manual no app.",
    group: "rotina",
  },
  {
    id: "semana-viva",
    title: "Semana viva",
    description: "Sete dias seguidos com pelo menos um lançamento.",
    group: "rotina",
  },
  {
    id: "mes-fiel",
    title: "Mês fiel",
    description: "Trinta dias seguidos com lançamentos registrados.",
    group: "rotina",
  },
  {
    id: "volta-certeira",
    title: "Volta certeira",
    description: "Voltou a registrar depois de alguns dias sem lançamentos.",
    group: "rotina",
  },
  {
    id: "mes-positivo",
    title: "Mês positivo",
    description: "Fechou um mês com sobra no orçamento disponível.",
    group: "sobra",
  },
  {
    id: "trio-positivo",
    title: "Trio positivo",
    description: "Três meses com sobra no ano corrente.",
    group: "sobra",
  },
  {
    id: "cofrinho-calmo",
    title: "Cofrinho calmo",
    description: "Somas de sobras mensais positivas passaram de R$ 500.",
    group: "sobra",
  },
];

export type ClosedMonthSurplus = {
  anoMes: string;
  sobraDoMes: number;
};

export type EvaluateAchievementsInput = {
  normalized: TransactionNormalized[];
  manualTransactions: Array<{ sourceId: string; id: string }>;
  accounts: Account[];
  recurringRules: RecurringRule[];
  structuralCategories: string[];
  snapshot: AchievementsSnapshot;
  today?: Date;
};

export type EvaluateAchievementsResult = {
  snapshot: AchievementsSnapshot;
  newlyUnlocked: Achievement[];
  allUnlocked: Achievement[];
};

function formatDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function daysBetweenDates(dateA: string, dateB: string): number {
  const a = new Date(`${dateA}T12:00:00.000Z`).getTime();
  const b = new Date(`${dateB}T12:00:00.000Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function getActivityDates(
  normalized: TransactionNormalized[],
): Set<string> {
  const dates = new Set<string>();
  for (const t of normalized) {
    if (t.dataISO) dates.add(t.dataISO.slice(0, 10));
  }
  return dates;
}

export function computeStreakDays(
  normalized: TransactionNormalized[],
  today: Date = new Date(),
): number {
  const dates = getActivityDates(normalized);
  if (dates.size === 0) return 0;

  const todayStr = formatDateIso(today);
  const yesterdayStr = formatDateIso(addDays(today, -1));

  let endDate: string | null = null;
  if (dates.has(todayStr)) endDate = todayStr;
  else if (dates.has(yesterdayStr)) endDate = yesterdayStr;
  else return 0;

  let streak = 0;
  let cursor = endDate;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = formatDateIso(addDays(new Date(`${cursor}T12:00:00.000Z`), -1));
  }
  return streak;
}

export function detectVoltaCerteira(
  normalized: TransactionNormalized[],
  today: Date = new Date(),
): boolean {
  const sorted = [...getActivityDates(normalized)].sort();
  if (sorted.length < 2) return false;

  const todayStr = formatDateIso(today);
  const yesterdayStr = formatDateIso(addDays(today, -1));
  const latest = sorted[sorted.length - 1]!;
  if (latest !== todayStr && latest !== yesterdayStr) return false;

  const previous = sorted[sorted.length - 2]!;
  const gapDays = daysBetweenDates(previous, latest);
  return gapDays >= 4;
}

function endOfMonthDate(anoMes: string): Date {
  const [year, month] = anoMes.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, lastDay, 12, 0, 0, 0));
}

export function computeClosedMonthSurplus(
  normalized: TransactionNormalized[],
  accounts: Account[],
  recurringRules: RecurringRule[],
  structuralCategories: string[],
  today: Date = new Date(),
): ClosedMonthSurplus[] {
  const current = currentMonthIso(today);
  const closedMonths = new Set<string>();
  for (const t of normalized) {
    if (t.anoMes && t.anoMes < current) closedMonths.add(t.anoMes);
  }

  const results: ClosedMonthSurplus[] = [];
  for (const anoMes of [...closedMonths].sort()) {
    const allowance = computeDailyAllowance({
      normalized,
      accounts,
      recurringRules,
      structuralCategories,
      today: endOfMonthDate(anoMes),
    });
    results.push({ anoMes, sobraDoMes: allowance.sobraDoMes });
  }
  return results;
}

function hasManualQuickEntry(
  manualTransactions: EvaluateAchievementsInput["manualTransactions"],
): boolean {
  return manualTransactions.some((t) => isManualQuickRaw(t));
}

function isUnlocked(snapshot: AchievementsSnapshot, id: AchievementId): boolean {
  return snapshot.unlocked.some((a) => a.id === id);
}

function unlock(
  snapshot: AchievementsSnapshot,
  id: AchievementId,
  at: string,
): { snapshot: AchievementsSnapshot; created: Achievement | null } {
  if (isUnlocked(snapshot, id)) {
    return { snapshot, created: null };
  }
  const achievement: Achievement = { id, unlockedAt: at };
  return {
    snapshot: {
      ...snapshot,
      unlocked: [...snapshot.unlocked, achievement],
    },
    created: achievement,
  };
}

export function mergeAchievementSnapshots(
  a: AchievementsSnapshot,
  b: AchievementsSnapshot,
): AchievementsSnapshot {
  const byId = new Map<AchievementId, Achievement>();
  for (const item of [...a.unlocked, ...b.unlocked]) {
    const existing = byId.get(item.id);
    if (!existing || item.unlockedAt < existing.unlockedAt) {
      byId.set(item.id, item);
    }
  }
  return {
    unlocked: [...byId.values()].sort((x, y) =>
      x.unlockedAt.localeCompare(y.unlockedAt),
    ),
    meta: {
      lastSobraTotal: Math.max(a.meta.lastSobraTotal, b.meta.lastSobraTotal),
      lastStreak: Math.max(a.meta.lastStreak, b.meta.lastStreak),
    },
  };
}

export function evaluateAchievements(
  input: EvaluateAchievementsInput,
): EvaluateAchievementsResult {
  const today = input.today ?? new Date();
  const unlockedAt = today.toISOString();
  let snapshot = input.snapshot ?? EMPTY_ACHIEVEMENTS;
  const newlyUnlocked: Achievement[] = [];

  const streak = computeStreakDays(input.normalized, today);
  const closedSurplus = computeClosedMonthSurplus(
    input.normalized,
    input.accounts,
    input.recurringRules,
    input.structuralCategories,
    today,
  );
  const positiveClosed = closedSurplus.filter((m) => m.sobraDoMes > 0);
  const sobraTotal = positiveClosed.reduce((s, m) => s + m.sobraDoMes, 0);
  const year = today.getUTCFullYear();
  const positiveInYear = positiveClosed.filter((m) =>
    m.anoMes.startsWith(`${year}-`),
  );

  snapshot = {
    ...snapshot,
    meta: {
      lastStreak: streak,
      lastSobraTotal: sobraTotal,
    },
  };

  const candidates: AchievementId[] = [];

  if (hasManualQuickEntry(input.manualTransactions)) {
    candidates.push("primeiro-passo");
  }
  if (streak >= 7) candidates.push("semana-viva");
  if (streak >= 30) candidates.push("mes-fiel");
  if (detectVoltaCerteira(input.normalized, today)) {
    candidates.push("volta-certeira");
  }
  if (positiveClosed.length >= 1) candidates.push("mes-positivo");
  if (positiveInYear.length >= 3) candidates.push("trio-positivo");
  if (sobraTotal >= COFRINHO_CALMO_THRESHOLD) candidates.push("cofrinho-calmo");

  for (const id of candidates) {
    const result = unlock(snapshot, id, unlockedAt);
    snapshot = result.snapshot;
    if (result.created) newlyUnlocked.push(result.created);
  }

  return {
    snapshot,
    newlyUnlocked,
    allUnlocked: snapshot.unlocked,
  };
}

export function getAchievementDefinition(
  id: AchievementId,
): AchievementDefinition | undefined {
  return ACHIEVEMENT_CATALOG.find((a) => a.id === id);
}
