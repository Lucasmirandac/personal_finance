"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { formatBRL } from "@/lib/format";
import { previewRecurringRule } from "@/lib/recurring";
import { RecurringKind, RecurringRule } from "@/lib/types";

const schema = z.object({
  kind: z.enum(["despesa_fixa", "receita"]),
  descricao: z.string().min(1, "Informe a descrição"),
  categoria: z.string().min(1, "Informe a categoria"),
  valor: z.number().positive("Valor deve ser positivo"),
  diaMes: z.number().int().min(1).max(31),
  inicio: z.string().min(1, "Informe a data de início"),
  fim: z.string().optional(),
});

export type RecurringFormValues = z.infer<typeof schema>;

type Props = {
  kind: RecurringKind;
  initial?: RecurringRule | null;
  onSubmit: (values: RecurringFormValues) => void;
  onCancel: () => void;
};

export function RecurringForm({ kind, initial, onSubmit, onCancel }: Props) {
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "");
  const [valorStr, setValorStr] = useState(
    initial ? String(initial.valor) : "",
  );
  const [diaMes, setDiaMes] = useState(String(initial?.diaMes ?? 5));
  const [inicio, setInicio] = useState(initial?.inicio ?? "2026-01-01");
  const [fim, setFim] = useState(initial?.fim ?? "");
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const valor = Number(valorStr.replace(",", "."));
    if (!descricao || !inicio || Number.isNaN(valor) || valor <= 0) {
      return null;
    }
    const dia = Number(diaMes);
    if (Number.isNaN(dia) || dia < 1 || dia > 31) return null;
    return previewRecurringRule({
      kind,
      descricao,
      categoria: categoria || "(sem categoria)",
      valor,
      diaMes: dia,
      inicio,
      fim: fim.trim() || null,
    });
  }, [kind, descricao, categoria, valorStr, diaMes, inicio, fim]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(valorStr.replace(",", "."));
    const parsed = schema.safeParse({
      kind,
      descricao: descricao.trim(),
      categoria: categoria.trim(),
      valor,
      diaMes: Number(diaMes),
      inicio,
      fim: fim.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setError(null);
    onSubmit({
      ...parsed.data,
      fim: parsed.data.fim?.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs subtle">Descrição</label>
          <input
            className="input mt-1"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={kind === "receita" ? "Salário" : "Aluguel"}
          />
        </div>
        <div>
          <label className="text-xs subtle">Categoria</label>
          <input
            className="input mt-1"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder={kind === "receita" ? "SALARIO" : "MORADIA"}
          />
        </div>
        <div>
          <label className="text-xs subtle">Valor (R$)</label>
          <input
            className="input mt-1"
            type="number"
            min="0"
            step="0.01"
            value={valorStr}
            onChange={(e) => setValorStr(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs subtle">Dia do mês</label>
          <input
            className="input mt-1"
            type="number"
            min={1}
            max={31}
            value={diaMes}
            onChange={(e) => setDiaMes(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs subtle">Início</label>
          <input
            className="input mt-1"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs subtle">Fim (opcional)</label>
          <input
            className="input mt-1"
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </div>
      </div>

      {preview && (
        <div className="rounded-lg bg-[var(--surface-2)] border border-[var(--border)] p-3 text-sm">
          Vai gerar <strong>{preview.count}</strong> ocorrência(s) · total{" "}
          <strong>{formatBRL(preview.total)}</strong>
        </div>
      )}

      {error && (
        <div className="text-sm text-[var(--danger)]">{error}</div>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          {initial ? "Salvar" : "Adicionar"}
        </button>
      </div>
    </form>
  );
}
