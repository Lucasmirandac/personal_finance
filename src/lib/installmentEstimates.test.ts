import { describe, expect, it } from "vitest";
import {
  collectInstallmentSlotKeys,
  collectLooseInstallmentSlotKeys,
  filterDuplicateIncomingRows,
  installmentSlotKey,
  removeStaleEstimatedInstallments,
} from "./installmentEstimates";
import type { Dataset, TransactionRaw } from "./types";

function installmentRow(
  partial: Partial<TransactionRaw> & {
    installment: NonNullable<TransactionRaw["installment"]>;
  },
): TransactionRaw {
  return {
    id: partial.id ?? "tx-1",
    data: partial.data ?? "07/08/2026",
    lancamento: partial.lancamento ?? "DECOLAR (compra 03/05/2026)",
    categoria: partial.categoria ?? "VIAGEM",
    tipo: partial.tipo ?? "Parcela 3/6",
    valorOriginal: partial.valorOriginal ?? 245.71,
    fonte: partial.fonte ?? "inter",
    sourceId: partial.sourceId ?? "src-old",
    installment: partial.installment,
  };
}

describe("removeStaleEstimatedInstallments", () => {
  it("removes estimated installments replaced by a new import with the same slot", () => {
    const groupKey = "inter|03/05/2026|decolar|VIAGEM|245.71|6";
    const dataset: Dataset = {
      sources: [
        {
          id: "src-old",
          fileName: "julho.csv",
          fonte: "inter",
          importedAt: "2026-07-01T00:00:00.000Z",
          rowsRaw: 1,
          raw: [
            installmentRow({
              id: "old-estimate",
              installment: {
                current: 3,
                total: 6,
                purchaseDate: "03/05/2026",
                groupKey,
                estimated: true,
              },
            }),
          ],
        },
      ],
    };

    const incoming: TransactionRaw[] = [
      installmentRow({
        id: "real-3",
        sourceId: "src-new",
        data: "07/08/2026",
        tipo: "Parcela 3/6",
        installment: {
          current: 3,
          total: 6,
          purchaseDate: "03/05/2026",
          groupKey,
          estimated: false,
        },
      }),
      installmentRow({
        id: "estimate-4",
        sourceId: "src-new",
        data: "07/09/2026",
        tipo: "Parcela 4/6",
        installment: {
          current: 4,
          total: 6,
          purchaseDate: "03/05/2026",
          groupKey,
          estimated: true,
        },
      }),
    ];

    const result = removeStaleEstimatedInstallments(dataset, incoming);
    expect(result.removedRawIds).toEqual(["old-estimate"]);
    expect(result.dataset.sources[0].raw).toHaveLength(0);
    expect(collectInstallmentSlotKeys(incoming)).toEqual(
      new Set([
        installmentSlotKey(groupKey, 3),
        installmentSlotKey(groupKey, 4),
      ]),
    );
  });

  it("keeps unrelated estimated installments", () => {
    const groupKey = "inter|03/05/2026|decolar|VIAGEM|245.71|6";
    const otherKey = "inter|01/01/2026|loja|OUTROS|10|3";
    const dataset: Dataset = {
      sources: [
        {
          id: "src-old",
          fileName: "julho.csv",
          fonte: "inter",
          importedAt: "2026-07-01T00:00:00.000Z",
          rowsRaw: 2,
          raw: [
            installmentRow({
              id: "keep-me",
              installment: {
                current: 2,
                total: 3,
                purchaseDate: "01/01/2026",
                groupKey: otherKey,
                estimated: true,
              },
            }),
            installmentRow({
              id: "remove-me",
              installment: {
                current: 3,
                total: 6,
                purchaseDate: "03/05/2026",
                groupKey,
                estimated: true,
              },
            }),
          ],
        },
      ],
    };

    const incoming: TransactionRaw[] = [
      installmentRow({
        id: "real-3",
        sourceId: "src-new",
        installment: {
          current: 3,
          total: 6,
          purchaseDate: "03/05/2026",
          groupKey,
          estimated: false,
        },
      }),
    ];

    const result = removeStaleEstimatedInstallments(dataset, incoming);
    expect(result.removedRawIds).toEqual(["remove-me"]);
    expect(result.dataset.sources[0].raw.map((row) => row.id)).toEqual([
      "keep-me",
    ]);
  });

  it("removes stale estimates when incoming real row matches on loose slot key only", () => {
    const strictGroupKey = "inter|03/05/2026|decolar|VIAGEM|245.76|6";
    const dataset: Dataset = {
      sources: [
        {
          id: "src-old",
          fileName: "junho.csv",
          fonte: "inter",
          importedAt: "2026-06-01T00:00:00.000Z",
          rowsRaw: 1,
          raw: [
            installmentRow({
              id: "old-estimate",
              valorOriginal: 245.76,
              lancamento: "DECOLAR (compra 03/05/2026)",
              installment: {
                current: 2,
                total: 6,
                purchaseDate: "03/05/2026",
                groupKey: strictGroupKey,
                estimated: true,
              },
            }),
          ],
        },
      ],
    };

    const incomingGroupKey = "inter|03/05/2026|decolar|VIAGEM|245.71|6";
    const incoming: TransactionRaw[] = [
      installmentRow({
        id: "real-2",
        sourceId: "src-new",
        valorOriginal: 245.71,
        installment: {
          current: 2,
          total: 6,
          purchaseDate: "03/05/2026",
          groupKey: incomingGroupKey,
          estimated: false,
        },
      }),
    ];

    const result = removeStaleEstimatedInstallments(dataset, incoming);
    expect(result.removedRawIds).toEqual(["old-estimate"]);
    expect(result.dataset.sources[0].raw).toHaveLength(0);
    expect(collectLooseInstallmentSlotKeys(incoming)).toEqual(
      new Set(["inter|03/05/2026|viagem|6|2"]),
    );
  });

  it("removes stale estimates when merchant text changes across invoices", () => {
    const dataset: Dataset = {
      sources: [
        {
          id: "src-old",
          fileName: "junho.csv",
          fonte: "inter",
          importedAt: "2026-06-01T00:00:00.000Z",
          rowsRaw: 1,
          raw: [
            installmentRow({
              id: "old-estimate",
              lancamento: "FeV GNV (compra 01/12/2025)",
              categoria: "SERVICOS",
              tipo: "Parcela 7/7",
              installment: {
                current: 7,
                total: 7,
                purchaseDate: "01/12/2025",
                groupKey: "inter|01/12/2025|fev gnv|SERVICOS|102.72|7",
                estimated: true,
              },
            }),
          ],
        },
      ],
    };

    const incoming: TransactionRaw[] = [
      installmentRow({
        id: "real-7",
        sourceId: "src-new",
        lancamento: "PG INFRACOMMERCE (compra 01/12/2025)",
        categoria: "SERVICOS",
        tipo: "Parcela 7/7",
        installment: {
          current: 7,
          total: 7,
          purchaseDate: "01/12/2025",
          groupKey:
            "inter|01/12/2025|pg infracommerce|SERVICOS|102.72|7",
          estimated: false,
        },
      }),
    ];

    const result = removeStaleEstimatedInstallments(dataset, incoming);
    expect(result.removedRawIds).toEqual(["old-estimate"]);
  });
});

describe("filterDuplicateIncomingRows", () => {
  it("skips installment rows whose loose slot already exists in the dataset", () => {
    const dataset: Dataset = {
      sources: [
        {
          id: "src-old",
          fileName: "maio.csv",
          fonte: "inter",
          importedAt: "2026-05-01T00:00:00.000Z",
          rowsRaw: 1,
          raw: [
            installmentRow({
              id: "existing-real",
              installment: {
                current: 1,
                total: 10,
                purchaseDate: "03/04/2026",
                groupKey: "inter|03/04/2026|dafiti|VESTUARIO|58.08|10",
                estimated: false,
              },
            }),
          ],
        },
      ],
    };

    const incoming: TransactionRaw[] = [
      installmentRow({
        id: "duplicate-real",
        sourceId: "src-new",
        valorOriginal: 58.08,
        installment: {
          current: 1,
          total: 10,
          purchaseDate: "03/04/2026",
          groupKey: "inter|03/04/2026|dafiti|VESTUARIO|58.08|10",
          estimated: false,
        },
      }),
      installmentRow({
        id: "new-real",
        sourceId: "src-new",
        valorOriginal: 57.99,
        tipo: "Parcela 2/10",
        installment: {
          current: 2,
          total: 10,
          purchaseDate: "03/04/2026",
          groupKey: "inter|03/04/2026|dafiti|VESTUARIO|57.99|10",
          estimated: false,
        },
      }),
    ];

    const result = filterDuplicateIncomingRows(dataset, incoming);
    expect(result.skippedRawIds).toEqual(["duplicate-real"]);
    expect(result.raw.map((row) => row.id)).toEqual(["new-real"]);
  });
});
