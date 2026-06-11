import {
  EditsState,
  InstallmentGroupEdit,
  InstallmentGroupEditsState,
  TransactionEdit,
  TransactionRaw,
} from "./types";

export const EMPTY_EDITS: EditsState = {};

export function isRecurringRaw(
  raw: Pick<TransactionRaw, "sourceId">,
): boolean {
  return (
    raw.sourceId.startsWith("manual:") &&
    raw.sourceId !== "manual:quick" &&
    !raw.sourceId.startsWith("manual:quick")
  );
}

export function isRecurringIncomeRaw(
  raw: Pick<TransactionRaw, "sourceId" | "tipo">,
): boolean {
  return isRecurringRaw(raw) && raw.tipo === "Receita";
}

export function isRecurringExpenseRaw(
  raw: Pick<TransactionRaw, "sourceId" | "tipo">,
): boolean {
  return isRecurringRaw(raw) && raw.tipo === "Despesa fixa";
}

export function isRecurringMonthlyRaw(
  raw: Pick<TransactionRaw, "sourceId" | "tipo">,
): boolean {
  return isRecurringIncomeRaw(raw) || isRecurringExpenseRaw(raw);
}

export function allowsPerMonthRecurringEdit(
  raw: Pick<TransactionRaw, "sourceId" | "tipo">,
): boolean {
  return isRecurringMonthlyRaw(raw);
}

export function recurringIncomeRawId(ruleId: string, anoMes: string): string {
  return `manual:${ruleId}:${anoMes}`;
}

export function recurringRuleIdFromRaw(
  raw: Pick<TransactionRaw, "sourceId" | "id">,
): string | null {
  if (!isRecurringRaw(raw)) return null;
  const fromSource = raw.sourceId.slice("manual:".length);
  if (fromSource) return fromSource;
  const parts = raw.id.split(":");
  if (parts.length >= 3 && parts[0] === "manual") return parts[1];
  return null;
}

export function hasGroupFieldEdits(
  edit: InstallmentGroupEdit | undefined,
): boolean {
  if (!edit) return false;
  return (
    edit.lancamento !== undefined ||
    edit.categoria !== undefined ||
    edit.tipo !== undefined ||
    edit.valorOriginal !== undefined
  );
}

export function isDeleted(
  rawId: string,
  edits: EditsState,
  groupEdits: InstallmentGroupEditsState = {},
  raw?: TransactionRaw,
): boolean {
  if (edits[rawId]?.deleted) return true;
  const groupKey = raw?.installment?.groupKey;
  if (groupKey && groupEdits[groupKey]?.deleted) return true;
  return false;
}

export function hasFieldEdits(edit: TransactionEdit | undefined): boolean {
  if (!edit) return false;
  return (
    edit.data !== undefined ||
    edit.lancamento !== undefined ||
    edit.categoria !== undefined ||
    edit.tipo !== undefined ||
    edit.valorOriginal !== undefined
  );
}

export function isEdited(
  rawId: string,
  edits: EditsState,
  groupEdits: InstallmentGroupEditsState = {},
  raw?: TransactionRaw,
): boolean {
  const edit = edits[rawId];
  if (edit && !edit.deleted && hasFieldEdits(edit)) return true;
  const groupKey = raw?.installment?.groupKey;
  if (!groupKey) return false;
  const groupEdit = groupEdits[groupKey];
  if (!groupEdit || groupEdit.deleted) return false;
  return hasGroupFieldEdits(groupEdit);
}

export function canRevertTransaction(
  rawId: string,
  edits: EditsState,
  groupEdits: InstallmentGroupEditsState = {},
  raw?: TransactionRaw,
): boolean {
  if (edits[rawId]) return true;
  const groupKey = raw?.installment?.groupKey;
  return !!(groupKey && groupEdits[groupKey]);
}

export function mergeRawWithGroupEdit(
  raw: TransactionRaw,
  groupEdit: InstallmentGroupEdit | undefined,
): TransactionRaw {
  if (!groupEdit || isRecurringRaw(raw)) return raw;
  return {
    ...raw,
    ...(groupEdit.lancamento !== undefined
      ? { lancamento: groupEdit.lancamento }
      : {}),
    ...(groupEdit.categoria !== undefined
      ? { categoria: groupEdit.categoria }
      : {}),
    ...(groupEdit.tipo !== undefined ? { tipo: groupEdit.tipo } : {}),
    ...(groupEdit.valorOriginal !== undefined
      ? { valorOriginal: groupEdit.valorOriginal }
      : {}),
  };
}

export function mergeRawWithEdit(
  raw: TransactionRaw,
  edit: TransactionEdit | undefined,
): TransactionRaw {
  if (!edit) return raw;
  if (isRecurringMonthlyRaw(raw)) {
    return {
      ...raw,
      ...(edit.data !== undefined ? { data: edit.data } : {}),
      ...(edit.valorOriginal !== undefined
        ? { valorOriginal: edit.valorOriginal }
        : {}),
    };
  }
  return {
    ...raw,
    ...(edit.data !== undefined ? { data: edit.data } : {}),
    ...(edit.lancamento !== undefined ? { lancamento: edit.lancamento } : {}),
    ...(edit.categoria !== undefined ? { categoria: edit.categoria } : {}),
    ...(edit.tipo !== undefined ? { tipo: edit.tipo } : {}),
    ...(edit.valorOriginal !== undefined
      ? { valorOriginal: edit.valorOriginal }
      : {}),
  };
}

export function mergeRawWithAllEdits(
  raw: TransactionRaw,
  edits: EditsState,
  groupEdits: InstallmentGroupEditsState = {},
): TransactionRaw {
  const groupKey = raw.installment?.groupKey;
  const groupEdit = groupKey ? groupEdits[groupKey] : undefined;
  return mergeRawWithEdit(mergeRawWithGroupEdit(raw, groupEdit), edits[raw.id]);
}

export function applyEdits(
  raws: TransactionRaw[],
  edits: EditsState,
  groupEdits: InstallmentGroupEditsState = {},
): { effective: TransactionRaw[]; deletedIds: Set<string> } {
  const deletedIds = new Set<string>();
  const effective: TransactionRaw[] = [];

  for (const raw of raws) {
    const groupKey = raw.installment?.groupKey;
    const groupEdit = groupKey ? groupEdits[groupKey] : undefined;
    const edit = edits[raw.id];

    if (groupEdit?.deleted) {
      deletedIds.add(raw.id);
      continue;
    }
    if (edit?.deleted) {
      deletedIds.add(raw.id);
      continue;
    }

    let merged = raw;
    if (groupEdit) {
      merged = mergeRawWithGroupEdit(merged, groupEdit);
    }
    effective.push(mergeRawWithEdit(merged, edit));
  }

  return { effective, deletedIds };
}

export function getDeletedRaws(
  raws: TransactionRaw[],
  edits: EditsState,
  groupEdits: InstallmentGroupEditsState = {},
): TransactionRaw[] {
  const deleted: TransactionRaw[] = [];
  for (const raw of raws) {
    const groupKey = raw.installment?.groupKey;
    const groupEdit = groupKey ? groupEdits[groupKey] : undefined;
    const edit = edits[raw.id];
    if (groupEdit?.deleted || edit?.deleted) {
      let merged = raw;
      if (groupEdit) {
        merged = mergeRawWithGroupEdit(merged, groupEdit);
      }
      deleted.push(mergeRawWithEdit(merged, edit));
    }
  }
  return deleted;
}

export function countDeleted(
  raws: TransactionRaw[],
  edits: EditsState,
  groupEdits: InstallmentGroupEditsState = {},
): number {
  return applyEdits(raws, edits, groupEdits).deletedIds.size;
}

export function pruneEditsForRawIds(
  edits: EditsState,
  rawIds: string[],
): EditsState {
  if (rawIds.length === 0) return edits;
  const next = { ...edits };
  for (const id of rawIds) {
    delete next[id];
  }
  return next;
}

export function pruneGroupEditsForGroupKeys(
  groupEdits: InstallmentGroupEditsState,
  groupKeys: string[],
): InstallmentGroupEditsState {
  if (groupKeys.length === 0) return groupEdits;
  const next = { ...groupEdits };
  for (const key of groupKeys) {
    delete next[key];
  }
  return next;
}

export type TransactionEditPatch = Omit<
  TransactionEdit,
  "rawId" | "editedAt" | "deleted"
>;

export type InstallmentGroupEditPatch = Pick<
  TransactionEditPatch,
  "lancamento" | "categoria" | "tipo" | "valorOriginal"
>;

export function buildEditEntry(
  rawId: string,
  existing: TransactionEdit | undefined,
  patch: TransactionEditPatch,
): TransactionEdit {
  return {
    rawId,
    editedAt: new Date().toISOString(),
    ...(existing?.deleted ? { deleted: existing.deleted } : {}),
    ...(existing?.data !== undefined ? { data: existing.data } : {}),
    ...(existing?.lancamento !== undefined
      ? { lancamento: existing.lancamento }
      : {}),
    ...(existing?.categoria !== undefined
      ? { categoria: existing.categoria }
      : {}),
    ...(existing?.tipo !== undefined ? { tipo: existing.tipo } : {}),
    ...(existing?.valorOriginal !== undefined
      ? { valorOriginal: existing.valorOriginal }
      : {}),
    ...patch,
  };
}

export function buildGroupEditEntry(
  groupKey: string,
  existing: InstallmentGroupEdit | undefined,
  patch: InstallmentGroupEditPatch,
): InstallmentGroupEdit {
  return {
    groupKey,
    editedAt: new Date().toISOString(),
    ...(existing?.deleted ? { deleted: existing.deleted } : {}),
    ...(existing?.lancamento !== undefined
      ? { lancamento: existing.lancamento }
      : {}),
    ...(existing?.categoria !== undefined
      ? { categoria: existing.categoria }
      : {}),
    ...(existing?.tipo !== undefined ? { tipo: existing.tipo } : {}),
    ...(existing?.valorOriginal !== undefined
      ? { valorOriginal: existing.valorOriginal }
      : {}),
    ...patch,
  };
}

export function pickGroupPatch(
  patch: TransactionEditPatch,
): InstallmentGroupEditPatch {
  const out: InstallmentGroupEditPatch = {};
  if (patch.lancamento !== undefined) out.lancamento = patch.lancamento;
  if (patch.categoria !== undefined) out.categoria = patch.categoria;
  if (patch.tipo !== undefined) out.tipo = patch.tipo;
  if (patch.valorOriginal !== undefined) out.valorOriginal = patch.valorOriginal;
  return out;
}

export function pickRecurringIncomePatch(
  patch: TransactionEditPatch,
): TransactionEditPatch {
  return pickRecurringMonthlyPatch(patch);
}

export function pickRecurringMonthlyPatch(
  patch: TransactionEditPatch,
): TransactionEditPatch {
  const out: TransactionEditPatch = {};
  if (patch.data !== undefined) out.data = patch.data;
  if (patch.valorOriginal !== undefined) out.valorOriginal = patch.valorOriginal;
  return out;
}

export function pickIndividualPatch(
  patch: TransactionEditPatch,
): TransactionEditPatch {
  const out: TransactionEditPatch = {};
  if (patch.data !== undefined) out.data = patch.data;
  return out;
}

export function recurringIncomeDeleteConfirmMessage(): string {
  return "Ocultar esta receita só deste mês? A regra em Recorrentes não muda.";
}

export function recurringExpenseDeleteConfirmMessage(): string {
  return "Ocultar esta conta só deste mês? A regra em Recorrentes não muda.";
}

export function recurringMonthlyDeleteConfirmMessage(
  raw: Pick<TransactionRaw, "sourceId" | "tipo">,
): string {
  return isRecurringIncomeRaw(raw)
    ? recurringIncomeDeleteConfirmMessage()
    : recurringExpenseDeleteConfirmMessage();
}

export function installmentDeleteConfirmMessage(
  installment: TransactionRaw["installment"],
  fallback: string,
): string {
  if (!installment) return fallback;
  return `Excluir todas as parcelas dessa compra (${installment.current}/${installment.total})? Você pode restaurá-las em Transações.`;
}
