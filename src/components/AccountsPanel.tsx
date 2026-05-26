"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ACCOUNT_KIND_LABELS,
  countTransactionsForAccount,
  createDefaultAccount,
  defaultAccount,
} from "@/lib/accounts";
import { useAppStore } from "@/lib/store";
import { Account, AccountKind, Settings } from "@/lib/types";
import { Plus, Star, Trash2, Pencil } from "lucide-react";

const KINDS: AccountKind[] = ["cc", "poupanca", "carteira", "cartao"];

const HORIZONS = [30, 60, 90, 180] as const;

type FormState = {
  nome: string;
  kind: AccountKind;
  saldoInicial: string;
  dataReferencia: string;
  diaFechamento: string;
  diaPagamento: string;
  fonteCsv: "inter" | "nubank" | "";
};

const emptyForm = (): FormState => ({
  nome: "",
  kind: "cc",
  saldoInicial: "0",
  dataReferencia: new Date().toISOString().slice(0, 10),
  diaFechamento: "10",
  diaPagamento: "20",
  fonteCsv: "",
});

type Props = {
  settings: Settings;
  onSaveSettings: (settings: Settings) => void | Promise<void>;
};

export function AccountsPanel({ settings, onSaveSettings }: Props) {
  const {
    accounts,
    dataset,
    manualTransactions,
    addAccount,
    updateAccount,
    removeAccount,
    setDefaultAccount,
  } = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState(settings.projectionHorizonDays);

  useEffect(() => {
    setHorizon(settings.projectionHorizonDays);
  }, [settings.projectionHorizonDays]);

  const cardFontesInDataset = useMemo(() => {
    const set = new Set<"inter" | "nubank">();
    for (const s of dataset.sources) {
      if (s.fonte === "inter" || s.fonte === "nubank") set.add(s.fonte);
    }
    return set;
  }, [dataset.sources]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setFormOpen(true);
  }

  function openEdit(account: Account) {
    setEditingId(account.id);
    setForm({
      nome: account.nome,
      kind: account.kind,
      saldoInicial: String(account.saldoInicial),
      dataReferencia: account.dataReferencia,
      diaFechamento: String(account.diaFechamento ?? 10),
      diaPagamento: String(account.diaPagamento ?? 20),
      fonteCsv: account.fonteCsv ?? "",
    });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const saldo = parseFloat(form.saldoInicial.replace(",", "."));
    if (Number.isNaN(saldo)) {
      setError("Saldo inicial inválido.");
      return;
    }
    if (!form.nome.trim()) {
      setError("Informe o nome da conta.");
      return;
    }

    const partial: Partial<Account> = {
      nome: form.nome.trim(),
      kind: form.kind,
      saldoInicial: saldo,
      dataReferencia: form.dataReferencia,
    };

    if (form.kind === "cartao") {
      partial.diaFechamento = Math.min(
        31,
        Math.max(1, Number(form.diaFechamento) || 10),
      );
      partial.diaPagamento = Math.min(
        31,
        Math.max(1, Number(form.diaPagamento) || 20),
      );
      if (form.fonteCsv === "inter" || form.fonteCsv === "nubank") {
        partial.fonteCsv = form.fonteCsv;
      }
    }

    try {
      if (editingId) {
        const existing = accounts.find((a) => a.id === editingId);
        if (!existing) return;
        await updateAccount({ ...existing, ...partial });
      } else {
        const acc = createDefaultAccount(form.kind, form.nome.trim(), partial);
        if (accounts.length === 0) acc.isDefault = true;
        await addAccount(acc);
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleRemove(id: string) {
    const count = countTransactionsForAccount(dataset, manualTransactions, id);
    if (count > 0) {
      setError(`Conta com ${count} transação(ões) — desative em vez de excluir.`);
      return;
    }
    if (!window.confirm("Excluir esta conta?")) return;
    try {
      await removeAccount(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function toggleActive(account: Account) {
    await updateAccount({ ...account, ativa: !account.ativa });
  }

  async function saveHorizon() {
    await onSaveSettings({
      ...settings,
      projectionHorizonDays: horizon,
    });
  }

  const def = defaultAccount(accounts);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="section-title">Contas</div>
          <p className="text-[11px] subtle mt-0.5">
            Contas correntes, poupança, carteira e cartões vinculados ao CSV.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
          <Plus size={13} />
          Nova conta
        </button>
      </div>

      {error && (
        <p className="text-xs text-[var(--danger)] panel p-2">{error}</p>
      )}

      {accounts.length === 0 ? (
        <p className="text-sm subtle panel p-4">
          Nenhuma conta cadastrada. Crie a Conta Principal com seu saldo atual.
        </p>
      ) : (
        <div className="panel divide-y">
          {accounts.map((a) => (
            <div
              key={a.id}
              className={clsx(
                "flex items-center justify-between gap-3 px-3 py-3 flex-wrap",
                !a.ativa && "opacity-60",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{a.nome}</span>
                  <span className="badge">{ACCOUNT_KIND_LABELS[a.kind]}</span>
                  {a.isDefault && (
                    <span className="badge badge-receita gap-1">
                      <Star size={10} />
                      Padrão
                    </span>
                  )}
                  {!a.ativa && <span className="badge">Inativa</span>}
                </div>
                <p className="text-xs subtle mt-0.5 num">
                  Saldo {a.saldoInicial.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}{" "}
                  · ref. {a.dataReferencia.split("-").reverse().join("/")}
                  {a.kind === "cartao" && a.fonteCsv && ` · ${a.fonteCsv}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!a.isDefault && a.ativa && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    title="Marcar como padrão (Quick Add)"
                    onClick={() => setDefaultAccount(a.id)}
                  >
                    <Star size={13} />
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => openEdit(a)}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => toggleActive(a)}
                >
                  {a.ativa ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-[var(--danger)]"
                  onClick={() => handleRemove(a.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setFormOpen(false)}>
          <form
            className="panel w-full max-w-md mx-4 p-4 space-y-3"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <div className="section-title">
              {editingId ? "Editar conta" : "Nova conta"}
            </div>
            <label className="block space-y-1">
              <span className="text-xs subtle">Nome</span>
              <input
                className="input w-full"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs subtle">Tipo</span>
              <select
                className="select w-full"
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.target.value as AccountKind }))
                }
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ACCOUNT_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="text-xs subtle">Saldo inicial (R$)</span>
                <input
                  className="input w-full num"
                  inputMode="decimal"
                  value={form.saldoInicial}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, saldoInicial: e.target.value }))
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs subtle">Data referência</span>
                <input
                  type="date"
                  className="input w-full"
                  value={form.dataReferencia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dataReferencia: e.target.value }))
                  }
                />
              </label>
            </div>
            {form.kind === "cartao" && (
              <>
                <label className="block space-y-1">
                  <span className="text-xs subtle">Vincular ao CSV</span>
                  <select
                    className="select w-full"
                    value={form.fonteCsv}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        fonteCsv: e.target.value as FormState["fonteCsv"],
                      }))
                    }
                  >
                    <option value="">Nenhum</option>
                    {cardFontesInDataset.has("inter") && (
                      <option value="inter">Inter</option>
                    )}
                    {cardFontesInDataset.has("nubank") && (
                      <option value="nubank">Nubank</option>
                    )}
                    {!cardFontesInDataset.size && (
                      <>
                        <option value="inter">Inter</option>
                        <option value="nubank">Nubank</option>
                      </>
                    )}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-xs subtle">Dia fechamento</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="input w-full"
                      value={form.diaFechamento}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, diaFechamento: e.target.value }))
                      }
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs subtle">Dia pagamento</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="input w-full"
                      value={form.diaPagamento}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, diaPagamento: e.target.value }))
                      }
                    />
                  </label>
                </div>
              </>
            )}
            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn btn-primary btn-sm">
                Salvar
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel p-4 space-y-2">
        <div className="section-title">Horizonte de projeção</div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="select w-auto"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
          >
            {HORIZONS.map((h) => (
              <option key={h} value={h}>
                {h} dias
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-sm" onClick={saveHorizon}>
            Salvar horizonte
          </button>
        </div>
        {def && (
          <p className="text-[11px] subtle">
            Conta padrão para Quick Add: <strong>{def.nome}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
