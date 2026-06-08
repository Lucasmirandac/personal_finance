import { describe, expect, it } from "vitest";
import {
  applyEdits,
  isEdited,
  mergeRawWithAllEdits,
} from "./edits";
import { TransactionRaw } from "./types";

const groupKey = "compra-teste|3";

function recurringIncomeRaw(id: string, valor = -5000): TransactionRaw {
  return {
    id,
    data: "05/06/2026",
    lancamento: "Salário",
    categoria: "SALARIO",
    tipo: "Receita",
    valorOriginal: valor,
    fonte: "manual",
    sourceId: "manual:salario",
  };
}

function recurringExpenseRaw(id: string): TransactionRaw {
  return {
    id,
    data: "10/06/2026",
    lancamento: "Aluguel",
    categoria: "MORADIA",
    tipo: "Despesa fixa",
    valorOriginal: 2000,
    fonte: "manual",
    sourceId: "manual:aluguel",
  };
}

function installmentRaw(
  id: string,
  current: number,
  data: string,
  categoria = "ENTRETENIMENTO",
): TransactionRaw {
  return {
    id,
    data,
    lancamento: `Parcela ${current}/3 (compra 01/05/2026)`,
    categoria,
    tipo: "Compra parcelada",
    valorOriginal: -100,
    fonte: "inter",
    sourceId: "src-1",
    installment: {
      current,
      total: 3,
      purchaseDate: "01/05/2026",
      groupKey,
      estimated: current > 1,
    },
  };
}

function plainRaw(id: string): TransactionRaw {
  return {
    id,
    data: "01/06/2026",
    lancamento: "Mercado",
    categoria: "MERCADO",
    tipo: "Compra",
    valorOriginal: -50,
    fonte: "inter",
    sourceId: "src-1",
  };
}

describe("applyEdits with recurring income", () => {
  it("applies valorOriginal override to recurring income", () => {
    const raw = recurringIncomeRaw("manual:salario:2026-06");
    const { effective } = applyEdits([raw], {
      "manual:salario:2026-06": {
        rawId: "manual:salario:2026-06",
        editedAt: "2026-06-01T00:00:00.000Z",
        valorOriginal: -4200,
      },
    });
    expect(effective).toHaveLength(1);
    expect(effective[0].valorOriginal).toBe(-4200);
  });

  it("marks recurring income as deleted", () => {
    const raw = recurringIncomeRaw("manual:salario:2026-06");
    const { effective, deletedIds } = applyEdits([raw], {
      "manual:salario:2026-06": {
        rawId: "manual:salario:2026-06",
        editedAt: "2026-06-01T00:00:00.000Z",
        deleted: true,
      },
    });
    expect(effective).toHaveLength(0);
    expect(deletedIds).toEqual(new Set(["manual:salario:2026-06"]));
  });

  it("ignores edits on recurring fixed expense", () => {
    const raw = recurringExpenseRaw("manual:aluguel:2026-06");
    const { effective } = applyEdits([raw], {
      "manual:aluguel:2026-06": {
        rawId: "manual:aluguel:2026-06",
        editedAt: "2026-06-01T00:00:00.000Z",
        valorOriginal: 1500,
      },
    });
    expect(effective[0].valorOriginal).toBe(2000);
  });

  it("marks recurring income as edited when valor changes", () => {
    const raw = recurringIncomeRaw("manual:salario:2026-06");
    expect(
      isEdited(
        raw.id,
        {
          [raw.id]: {
            rawId: raw.id,
            editedAt: "2026-06-01T00:00:00.000Z",
            valorOriginal: -4200,
          },
        },
        {},
        raw,
      ),
    ).toBe(true);
  });
});

describe("applyEdits with installment group edits", () => {
  const raws = [
    installmentRaw("p1", 1, "07/06/2026"),
    installmentRaw("p2", 2, "07/07/2026"),
    installmentRaw("p3", 3, "07/08/2026"),
    plainRaw("plain-1"),
  ];

  it("behaves like before when group edits are empty", () => {
    const { effective, deletedIds } = applyEdits(raws, {
      "plain-1": {
        rawId: "plain-1",
        editedAt: "2026-01-01T00:00:00.000Z",
        categoria: "LAZER",
      },
    });
    expect(deletedIds.size).toBe(0);
    expect(effective.find((r) => r.id === "plain-1")?.categoria).toBe("LAZER");
    expect(effective.find((r) => r.id === "p1")?.categoria).toBe("ENTRETENIMENTO");
  });

  it("applies group categoria to all installments with same groupKey", () => {
    const { effective } = applyEdits(raws, {}, {
      [groupKey]: {
        groupKey,
        editedAt: "2026-01-01T00:00:00.000Z",
        categoria: "LAZER",
      },
    });
    expect(effective.filter((r) => r.categoria === "LAZER")).toHaveLength(3);
    expect(effective.find((r) => r.id === "plain-1")?.categoria).toBe("MERCADO");
  });

  it("marks all group raw ids as deleted when group edit is deleted", () => {
    const { effective, deletedIds } = applyEdits(raws, {}, {
      [groupKey]: {
        groupKey,
        editedAt: "2026-01-01T00:00:00.000Z",
        deleted: true,
      },
    });
    expect(effective.map((r) => r.id)).toEqual(["plain-1"]);
    expect(deletedIds).toEqual(new Set(["p1", "p2", "p3"]));
  });

  it("keeps individual data edit on one installment only", () => {
    const { effective } = applyEdits(
      raws,
      {
        p2: {
          rawId: "p2",
          editedAt: "2026-01-02T00:00:00.000Z",
          data: "08/07/2026",
        },
      },
      {
        [groupKey]: {
          groupKey,
          editedAt: "2026-01-01T00:00:00.000Z",
          categoria: "LAZER",
        },
      },
    );
    expect(effective.find((r) => r.id === "p1")?.data).toBe("07/06/2026");
    expect(effective.find((r) => r.id === "p2")?.data).toBe("08/07/2026");
    expect(effective.find((r) => r.id === "p3")?.data).toBe("07/08/2026");
    expect(effective.find((r) => r.id === "p2")?.categoria).toBe("LAZER");
  });

  it("applies individual categoria only when raw has no groupKey", () => {
    const { effective } = applyEdits(raws, {
      "plain-1": {
        rawId: "plain-1",
        editedAt: "2026-01-01T00:00:00.000Z",
        categoria: "LAZER",
      },
    });
    expect(effective.find((r) => r.id === "plain-1")?.categoria).toBe("LAZER");
    expect(effective.find((r) => r.id === "p1")?.categoria).toBe("ENTRETENIMENTO");
  });
});

describe("isEdited with group edits", () => {
  const raw = installmentRaw("p2", 2, "07/07/2026");

  it("returns true when group has field edits", () => {
    expect(
      isEdited(
        "p2",
        {},
        {
          [groupKey]: {
            groupKey,
            editedAt: "2026-01-01T00:00:00.000Z",
            categoria: "LAZER",
          },
        },
        raw,
      ),
    ).toBe(true);
  });

  it("returns true for individual data edit only", () => {
    expect(
      isEdited(
        "p2",
        {
          p2: {
            rawId: "p2",
            editedAt: "2026-01-01T00:00:00.000Z",
            data: "08/07/2026",
          },
        },
        {},
        raw,
      ),
    ).toBe(true);
  });
});

describe("mergeRawWithAllEdits", () => {
  it("combines group and individual layers", () => {
    const raw = installmentRaw("p2", 2, "07/07/2026");
    const merged = mergeRawWithAllEdits(
      raw,
      {
        p2: {
          rawId: "p2",
          editedAt: "2026-01-02T00:00:00.000Z",
          data: "08/07/2026",
        },
      },
      {
        [groupKey]: {
          groupKey,
          editedAt: "2026-01-01T00:00:00.000Z",
          categoria: "LAZER",
        },
      },
    );
    expect(merged.categoria).toBe("LAZER");
    expect(merged.data).toBe("08/07/2026");
  });
});
