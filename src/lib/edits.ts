import { EditsState, TransactionEdit, TransactionRaw } from "./types";

export const EMPTY_EDITS: EditsState = {};

export function isRecurringRaw(raw: TransactionRaw): boolean {
  return raw.sourceId.startsWith("manual:");
}

export function isDeleted(rawId: string, edits: EditsState): boolean {
  return edits[rawId]?.deleted === true;
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

export function isEdited(rawId: string, edits: EditsState): boolean {
  const edit = edits[rawId];
  if (!edit || edit.deleted) return false;
  return hasFieldEdits(edit);
}

export function mergeRawWithEdit(
  raw: TransactionRaw,
  edit: TransactionEdit | undefined,
): TransactionRaw {
  if (!edit || isRecurringRaw(raw)) return raw;
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

export function applyEdits(
  raws: TransactionRaw[],
  edits: EditsState,
): { effective: TransactionRaw[]; deletedIds: Set<string> } {
  const deletedIds = new Set<string>();
  const effective: TransactionRaw[] = [];

  for (const raw of raws) {
    if (isRecurringRaw(raw)) {
      effective.push(raw);
      continue;
    }
    const edit = edits[raw.id];
    if (edit?.deleted) {
      deletedIds.add(raw.id);
      continue;
    }
    effective.push(mergeRawWithEdit(raw, edit));
  }

  return { effective, deletedIds };
}

export function getDeletedRaws(
  raws: TransactionRaw[],
  edits: EditsState,
): TransactionRaw[] {
  const deleted: TransactionRaw[] = [];
  for (const raw of raws) {
    if (isRecurringRaw(raw)) continue;
    const edit = edits[raw.id];
    if (edit?.deleted) {
      deleted.push(mergeRawWithEdit(raw, edit));
    }
  }
  return deleted;
}

export function countDeleted(edits: EditsState): number {
  return Object.values(edits).filter((e) => e.deleted).length;
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

export type TransactionEditPatch = Omit<
  TransactionEdit,
  "rawId" | "editedAt" | "deleted"
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
