"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { todayIso, yyyyMmFromIso } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { previewRecurringRule } from "@/lib/recurring";
import { RecurringKind, RecurringRule } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { IntegerInput } from "@/components/ui/IntegerInput";

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

function initialDiaMes(initial?: RecurringRule | null): string {
  if (!initial || !Number.isFinite(initial.diaMes)) return "5";
  return String(Math.min(31, Math.max(1, Math.round(initial.diaMes))));
}

export function RecurringForm({ kind, initial, onSubmit, onCancel }: Props) {
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "");
  const [valorStr, setValorStr] = useState(
    initial ? String(initial.valor) : "",
  );
  const [diaMes, setDiaMes] = useState(initialDiaMes(initial));
  const [inicio, setInicio] = useState(
    initial?.inicio ?? `${yyyyMmFromIso(todayIso())}-01`,
  );
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
          <label className="text-xs text-muted" htmlFor="recurring-descricao">
            Descrição
          </label>
          <Input
            id="recurring-descricao"
            className="mt-1"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={kind === "receita" ? "Salário" : "Aluguel"}
          />
        </div>
        <div>
          <label className="text-xs text-muted" htmlFor="recurring-categoria">
            Categoria
          </label>
          <Input
            id="recurring-categoria"
            className="mt-1"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder={kind === "receita" ? "SALARIO" : "MORADIA"}
          />
        </div>
        <div>
          <label className="text-xs text-muted" htmlFor="recurring-valor">
            Valor (R$)
          </label>
          <MoneyInput
            id="recurring-valor"
            className="mt-1"
            value={valorStr}
            onChange={setValorStr}
          />
        </div>
        <div>
          <label className="text-xs text-muted" htmlFor="recurring-dia-mes">
            Dia do mês
          </label>
          <IntegerInput
            id="recurring-dia-mes"
            className="mt-1"
            min={1}
            max={31}
            value={diaMes}
            onChange={setDiaMes}
          />
        </div>
        <div>
          <label className="text-xs text-muted" htmlFor="recurring-inicio">
            Início
          </label>
          <Input
            id="recurring-inicio"
            className="mt-1"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted" htmlFor="recurring-fim">
            Fim (opcional)
          </label>
          <Input
            id="recurring-fim"
            className="mt-1"
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </div>
      </div>

      {preview && (
        <div className="rounded-lg bg-surface-2 border border-border p-3 text-sm">
          Vai gerar <strong>{preview.count}</strong> ocorrência(s) · total{" "}
          <strong>{formatBRL(preview.total)}</strong>
        </div>
      )}

      {error && <div className="text-sm text-danger">{error}</div>}

      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary">
          {initial ? "Salvar" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}
