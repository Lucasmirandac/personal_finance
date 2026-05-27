"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { createBudget, uniqueCategoriesFromTransactions } from "@/lib/budgets";
import { useAppStore } from "@/lib/store";
import { CategoryBudget } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Num } from "@/components/ui/Num";
import { Panel } from "@/components/ui/Panel";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Plus, Pencil, Trash2 } from "lucide-react";

type FormState = {
  categoria: string;
  valorMensal: string;
  ativa: boolean;
};

const emptyForm = (): FormState => ({
  categoria: "",
  valorMensal: "",
  ativa: true,
});

export function BudgetsPanel() {
  const {
    normalized,
    budgets,
    addBudget,
    updateBudget,
    removeBudget,
    toggleBudget,
  } = useAppStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const categorySuggestions = useMemo(
    () => uniqueCategoriesFromTransactions(normalized),
    [normalized],
  );

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  function openEdit(budget: CategoryBudget) {
    setEditingId(budget.id);
    setForm({
      categoria: budget.categoria,
      valorMensal: String(budget.valorMensal),
      ativa: budget.ativa,
    });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valor = parseFloat(form.valorMensal.replace(",", "."));
    if (!form.categoria.trim()) {
      setError("Informe a categoria.");
      return;
    }
    if (Number.isNaN(valor) || valor <= 0) {
      setError("Informe um valor mensal válido.");
      return;
    }

    try {
      if (editingId) {
        const existing = budgets.find((b) => b.id === editingId);
        if (!existing) return;
        await updateBudget({
          ...existing,
          categoria: form.categoria.trim(),
          valorMensal: valor,
          ativa: form.ativa,
        });
      } else {
        await addBudget(createBudget(form.categoria.trim(), valor, { ativa: form.ativa }));
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Excluir este orçamento?")) return;
    try {
      await removeBudget(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <SectionTitle>Orçamentos por categoria</SectionTitle>
          <p className="text-[11px] text-muted mt-0.5">
            Defina limites mensais e receba alertas em 80% e 100%.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openNew}>
          <Plus size={13} />
          Novo orçamento
        </Button>
      </div>

      {error && !formOpen && (
        <Panel className="p-2">
          <p className="text-xs text-danger">{error}</p>
        </Panel>
      )}

      {budgets.length === 0 ? (
        <Panel className="p-4">
          <p className="text-sm text-muted">
            Crie limites para as categorias que você quer controlar de perto.
          </p>
        </Panel>
      ) : (
        <Panel className="divide-y divide-border">
          {budgets.map((b) => (
            <div
              key={b.id}
              className={clsx(
                "flex items-center justify-between gap-3 px-3 py-3 flex-wrap",
                !b.ativa && "opacity-60",
              )}
            >
              <div>
                <div className="font-medium text-sm">{b.categoria}</div>
                <Num className="block text-xs text-muted">
                  {formatBRL(b.valorMensal)}/mês
                  {!b.ativa && " · inativo"}
                </Num>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                  <Pencil size={13} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleBudget(b.id)}>
                  {b.ativa ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onClick={() => handleRemove(b.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </Panel>
      )}

      {formOpen && (
        <DrawerBackdrop
          role="presentation"
          onClick={() => setFormOpen(false)}
        >
          <form
            className="bg-surface border border-border rounded-lg w-full max-w-md mx-4 p-4 space-y-3"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <SectionTitle>
              {editingId ? "Editar orçamento" : "Novo orçamento"}
            </SectionTitle>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Categoria</span>
              <Input
                list="budget-category-suggestions"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                required
              />
              <datalist id="budget-category-suggestions">
                {categorySuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Valor mensal (R$)</span>
              <Input
                className="font-mono tabular-nums"
                inputMode="decimal"
                value={form.valorMensal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valorMensal: e.target.value }))
                }
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.ativa}
                onChange={(e) => setForm((f) => ({ ...f, ativa: e.target.checked }))}
              />
              Ativo
            </label>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm">
                Salvar
              </Button>
              <Button size="sm" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DrawerBackdrop>
      )}
    </div>
  );
}
