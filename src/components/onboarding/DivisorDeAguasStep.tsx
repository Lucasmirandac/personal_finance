"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { RecurringForm, RecurringFormValues } from "@/components/RecurringForm";
import { LeverageGauge } from "@/components/leverage/LeverageGauge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Num } from "@/components/ui/Num";
import { normalizeBudgetCategory } from "@/lib/budgets";
import { formatBRL } from "@/lib/format";
import {
  computeLeverageRatio,
  rankCategoryCsvCandidates,
} from "@/lib/leverage";
import { newRecurringId } from "@/lib/recurring";
import { useAppStore } from "@/lib/store";
import { RecurringKind, RecurringRule } from "@/lib/types";
import { CheckCircle2, Plus } from "lucide-react";

const KIND_LABELS: Record<RecurringKind, string> = {
  receita: "Receita",
  despesa_fixa: "Despesa fixa",
};

export function DivisorDeAguasStep() {
  const {
    dataset,
    normalized,
    recurringRules,
    structuralCategories,
    toggleStructuralCategory,
    addRecurring,
  } = useAppStore();

  const [creating, setCreating] = useState<RecurringKind | null>(null);
  const [lastAdded, setLastAdded] = useState<RecurringKind | null>(null);

  const ratio = useMemo(
    () =>
      computeLeverageRatio({
        recurringRules,
        normalized,
        structuralCategories,
      }),
    [recurringRules, normalized, structuralCategories],
  );

  const receitas = recurringRules.filter((r) => r.kind === "receita" && r.ativo);
  const despesas = recurringRules.filter(
    (r) => r.kind === "despesa_fixa" && r.ativo,
  );

  const categoriasComRegra = useMemo(
    () =>
      new Set(
        despesas.map((r) => normalizeBudgetCategory(r.categoria)),
      ),
    [despesas],
  );

  const csvCandidates = useMemo(
    () => rankCategoryCsvCandidates(normalized),
    [normalized],
  );

  const hasCsv = dataset.sources.length > 0;

  async function handleSubmit(values: RecurringFormValues) {
    await addRecurring({
      id: newRecurringId(),
      kind: values.kind,
      descricao: values.descricao,
      categoria: values.categoria,
      valor: values.valor,
      diaMes: values.diaMes,
      inicio: values.inicio,
      fim: values.fim?.trim() || null,
      ativo: true,
      criadoEm: new Date().toISOString(),
    });
    setLastAdded(values.kind);
    setCreating(null);
  }

  return (
    <div className="mt-3 space-y-4">
      <LeverageGauge ratio={ratio} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <RecurringSummaryCard
          title="Renda"
          subtitle="Entradas mensais como salário"
          rules={receitas}
          kind="receita"
          creating={creating === "receita"}
          justAdded={lastAdded === "receita" && creating !== "receita"}
          onAdd={() => {
            setLastAdded(null);
            setCreating("receita");
          }}
          onCancel={() => setCreating(null)}
          onSubmit={handleSubmit}
        />
        <RecurringSummaryCard
          title="Custo fixo"
          subtitle="Saídas difíceis de mudar, como aluguel"
          rules={despesas}
          kind="despesa_fixa"
          creating={creating === "despesa_fixa"}
          justAdded={lastAdded === "despesa_fixa" && creating !== "despesa_fixa"}
          onAdd={() => {
            setLastAdded(null);
            setCreating("despesa_fixa");
          }}
          onCancel={() => setCreating(null)}
          onSubmit={handleSubmit}
        />
      </div>

      {hasCsv ? (
        <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
          <div>
            <p className="text-xs font-medium">Categorias estruturais do CSV</p>
            <p className="text-[11px] text-muted mt-0.5">
              Marque categorias do cartão que representam custos fixos. Usamos a
              mediana dos últimos 3 meses fechados.
            </p>
          </div>
          {csvCandidates.length === 0 ? (
            <p className="text-xs text-muted">
              Nenhuma categoria com gasto recorrente detectada no CSV ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {csvCandidates.map((candidate) => {
                const cat = normalizeBudgetCategory(candidate.categoria);
                const coveredByRule = categoriasComRegra.has(cat);
                const checked = structuralCategories.some(
                  (c) => normalizeBudgetCategory(c) === cat,
                );
                return (
                  <li
                    key={cat}
                    className={clsx(
                      "flex items-start gap-2 text-xs",
                      coveredByRule && "opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      id={`structural-${cat}`}
                      className="mt-0.5"
                      checked={checked}
                      disabled={coveredByRule}
                      onChange={() => toggleStructuralCategory(cat)}
                    />
                    <label htmlFor={`structural-${cat}`} className="min-w-0 flex-1">
                      <span className="font-medium">{cat}</span>
                      <span className="text-muted ml-2">
                        <Num>{formatBRL(candidate.mediana3m)}</Num>/mês
                        {candidate.mesesComDado < 3 && (
                          <span className="ml-1">
                            (histórico curto: {candidate.mesesComDado} mês
                            {candidate.mesesComDado === 1 ? "" : "es"})
                          </span>
                        )}
                      </span>
                      {coveredByRule && (
                        <span className="block text-[11px] text-muted mt-0.5">
                          Já coberto por despesa fixa cadastrada
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Importe o CSV no passo 1 para detectar candidatos a custo fixo no
          cartão.
        </p>
      )}
    </div>
  );
}

type RecurringSummaryCardProps = {
  title: string;
  subtitle: string;
  rules: RecurringRule[];
  kind: RecurringKind;
  creating: boolean;
  justAdded: boolean;
  onAdd: () => void;
  onCancel: () => void;
  onSubmit: (values: RecurringFormValues) => void;
};

function RecurringSummaryCard({
  title,
  subtitle,
  rules,
  kind,
  creating,
  justAdded,
  onAdd,
  onCancel,
  onSubmit,
}: Readonly<RecurringSummaryCardProps>) {
  const total = rules.reduce((acc, r) => acc + Math.abs(r.valor), 0);
  const count = rules.length;
  const addLabel =
    count === 0 ? `+ ${KIND_LABELS[kind]}` : `Adicionar outra ${KIND_LABELS[kind].toLowerCase()}`;

  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium">{title}</p>
            {count > 0 && (
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                {count} cadastrada{count === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted">{subtitle}</p>
          <p className="text-sm font-semibold mt-1 tabular-nums">
            {formatBRL(total)}/mês
          </p>
        </div>
        {!creating && (
          <Button size="sm" variant="primary" className="rounded-full" onClick={onAdd}>
            <Plus size={12} />
            {count === 0 ? KIND_LABELS[kind] : "Adicionar mais"}
          </Button>
        )}
      </div>

      {justAdded && !creating && (
        <div className="flex items-center gap-2 rounded-md bg-success/10 px-2 py-1.5 text-[11px] text-success">
          <CheckCircle2 size={13} />
          Cadastrada. Adicione outra ou siga para o painel.
        </div>
      )}

      {creating && (
        <div className="border-t border-border/60 pt-3">
          <RecurringForm kind={kind} onSubmit={onSubmit} onCancel={onCancel} />
        </div>
      )}

      {rules.length > 0 && (
        <ul className="space-y-1.5 border-t border-border/60 pt-2">
          {rules.slice(0, 3).map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-medium truncate block">{rule.descricao}</span>
                <Badge variant={kind === "receita" ? "receita" : "fixa"} dot>
                  dia {rule.diaMes}
                </Badge>
              </div>
              <Num className="shrink-0">{formatBRL(rule.valor)}</Num>
            </li>
          ))}
          {rules.length > 3 && (
            <li className="text-[11px] text-muted">
              +{rules.length - 3} outra(s) em Recorrentes
            </li>
          )}
        </ul>
      )}

      {!creating && count > 0 && (
        <button
          type="button"
          className="text-[11px] text-muted underline underline-offset-4 hover:text-foreground"
          onClick={onAdd}
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}
