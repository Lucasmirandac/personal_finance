import { describe, expect, it } from "vitest";
import {
  collectInstallmentSlotKeys,
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
});
