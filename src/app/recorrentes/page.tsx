"use client";

import { useState } from "react";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import { formatBRL, formatDateBR } from "@/lib/format";
import { newRecurringId } from "@/lib/recurring";
import { RecurringForm, RecurringFormValues } from "@/components/RecurringForm";
import { SubscriptionsPanel } from "@/components/SubscriptionsPanel";
import { RecurringKind, RecurringRule } from "@/lib/types";
import { Pencil, Plus, Trash2 } from "lucide-react";

const KIND_LABELS: Record<RecurringKind, string> = {
  receita: "Receita",
  despesa_fixa: "Despesa fixa",
};

export default function RecorrentesPage() {
  const {
    loaded,
    recurringRules,
    addRecurring,
    updateRecurring,
    removeRecurring,
    toggleRecurring,
  } = useAppStore();

  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [creating, setCreating] = useState<RecurringKind | null>(null);

  if (!loaded) return <div className="subtle">Carregando…</div>;

  const receitas = recurringRules.filter((r) => r.kind === "receita");
  const despesas = recurringRules.filter((r) => r.kind === "despesa_fixa");

  async function handleSubmit(values: RecurringFormValues) {
    if (editing) {
      await updateRecurring({
        ...editing,
        kind: values.kind,
        descricao: values.descricao,
        categoria: values.categoria,
        valor: values.valor,
        diaMes: values.diaMes,
        inicio: values.inicio,
        fim: values.fim?.trim() || null,
      });
      setEditing(null);
      return;
    }
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
    setCreating(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Recorrentes</h1>
        <p className="subtle text-xs mt-0.5 max-w-xl">
          Despesas fixas e receitas mensais geradas automaticamente no dashboard.
        </p>
      </div>

      <SubscriptionsPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RuleSection
          title="Receitas"
          subtitle="Entradas mensais como salário"
          rules={receitas}
          kind="receita"
          creating={creating === "receita"}
          editing={editing?.kind === "receita" ? editing : null}
          onAdd={() => {
            setEditing(null);
            setCreating("receita");
          }}
          onEdit={(r) => {
            setCreating(null);
            setEditing(r);
          }}
          onCancelForm={() => {
            setCreating(null);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
          onToggle={toggleRecurring}
          onRemove={removeRecurring}
        />
        <RuleSection
          title="Despesas fixas"
          subtitle="Saídas mensais como aluguel e boletos"
          rules={despesas}
          kind="despesa_fixa"
          creating={creating === "despesa_fixa"}
          editing={editing?.kind === "despesa_fixa" ? editing : null}
          onAdd={() => {
            setEditing(null);
            setCreating("despesa_fixa");
          }}
          onEdit={(r) => {
            setCreating(null);
            setEditing(r);
          }}
          onCancelForm={() => {
            setCreating(null);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
          onToggle={toggleRecurring}
          onRemove={removeRecurring}
        />
      </div>
    </div>
  );
}

function RuleSection({
  title,
  subtitle,
  rules,
  kind,
  creating,
  editing,
  onAdd,
  onEdit,
  onCancelForm,
  onSubmit,
  onToggle,
  onRemove,
}: {
  title: string;
  subtitle: string;
  rules: RecurringRule[];
  kind: RecurringKind;
  creating: boolean;
  editing: RecurringRule | null;
  onAdd: () => void;
  onEdit: (r: RecurringRule) => void;
  onCancelForm: () => void;
  onSubmit: (v: RecurringFormValues) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const showForm = creating || editing;

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border)]">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="text-[11px] subtle">{subtitle}</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            <Plus size={13} />
            Nova
          </button>
        )}
      </div>

      {showForm && (
        <div className="px-3 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <div className="text-xs font-medium mb-2">
            {editing ? "Editar" : "Nova"} {KIND_LABELS[kind].toLowerCase()}
          </div>
          <RecurringForm
            kind={kind}
            initial={editing}
            onSubmit={onSubmit}
            onCancel={onCancelForm}
          />
        </div>
      )}

      {rules.length === 0 && !showForm && (
        <p className="text-xs subtle px-3 py-4">Nenhuma regra cadastrada.</p>
      )}

      <ul className="divide-y divide-[var(--border)]">
        {rules.map((r) => (
          <li
            key={r.id}
            className={clsx("px-3 py-2.5", !r.ativo && "opacity-50")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm">{r.descricao}</div>
                <div className="text-[11px] subtle mt-0.5 flex flex-wrap items-center gap-2">
                  <span
                    className={clsx(
                      "badge badge-dot",
                      r.kind === "receita" ? "badge-receita" : "badge-fixa",
                    )}
                  >
                    {KIND_LABELS[r.kind]}
                  </span>
                  <span>{r.categoria}</span>
                  <span className="num">{formatBRL(r.valor)}</span>
                  <span>dia {r.diaMes}</span>
                </div>
                <div className="text-[11px] subtle mt-0.5">
                  {formatDateBR(r.inicio)}
                  {r.fim ? ` – ${formatDateBR(r.fim)}` : " – indeterminado"}
                </div>
              </div>
              <label className="flex items-center gap-1 text-[11px] shrink-0">
                <input
                  type="checkbox"
                  checked={r.ativo}
                  onChange={() => onToggle(r.id)}
                />
                Ativo
              </label>
            </div>
            <div className="flex gap-2 mt-1.5">
              <button className="btn btn-sm" onClick={() => onEdit(r)}>
                <Pencil size={12} />
                Editar
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (confirm(`Excluir "${r.descricao}"?`)) onRemove(r.id);
                }}
              >
                <Trash2 size={12} />
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
