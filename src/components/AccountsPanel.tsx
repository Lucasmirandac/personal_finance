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
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Input, Select } from "@/components/ui/Input";
import { Num } from "@/components/ui/Num";
import { Panel } from "@/components/ui/Panel";
import { SectionTitle } from "@/components/ui/SectionTitle";
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
          <SectionTitle>Contas</SectionTitle>
          <p className="text-[11px] text-muted mt-0.5">
            Contas correntes, poupança, carteira e cartões vinculados ao CSV.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openNew}>
          <Plus size={13} />
          Nova conta
        </Button>
      </div>

      {error && (
        <Panel className="p-2">
          <p className="text-xs text-danger">{error}</p>
        </Panel>
      )}

      {accounts.length === 0 ? (
        <Panel className="p-4">
          <p className="text-sm text-muted">
            Nenhuma conta cadastrada. Crie a Conta Principal com seu saldo atual.
          </p>
        </Panel>
      ) : (
        <Panel className="divide-y divide-border">
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
                  <Badge>{ACCOUNT_KIND_LABELS[a.kind]}</Badge>
                  {a.isDefault && (
                    <Badge variant="receita">
                      <Star size={10} />
                      Padrão
                    </Badge>
                  )}
                  {!a.ativa && <Badge>Inativa</Badge>}
                </div>
                <Num className="block text-xs text-muted mt-0.5">
                  Saldo {a.saldoInicial.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}{" "}
                  · ref. {a.dataReferencia.split("-").reverse().join("/")}
                  {a.kind === "cartao" && a.fonteCsv && ` · ${a.fonteCsv}`}
                </Num>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!a.isDefault && a.ativa && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Marcar como padrão (Quick Add)"
                    onClick={() => setDefaultAccount(a.id)}
                  >
                    <Star size={13} />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                  <Pencil size={13} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(a)}>
                  {a.ativa ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onClick={() => handleRemove(a.id)}
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
            <div className="space-y-3">
              <SectionTitle>
                {editingId ? "Editar conta" : "Nova conta"}
              </SectionTitle>
              <label className="block space-y-1">
                <span className="text-xs text-muted">Nome</span>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted">Tipo</span>
                <Select
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
                </Select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-xs text-muted">Saldo inicial (R$)</span>
                  <Input
                    className="font-mono tabular-nums"
                    inputMode="decimal"
                    value={form.saldoInicial}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, saldoInicial: e.target.value }))
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-muted">Data referência</span>
                  <Input
                    type="date"
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
                    <span className="text-xs text-muted">Vincular ao CSV</span>
                    <Select
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
                    </Select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <span className="text-xs text-muted">Dia fechamento</span>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={form.diaFechamento}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, diaFechamento: e.target.value }))
                        }
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-muted">Dia pagamento</span>
                      <Input
                        type="number"
                        min={1}
                        max={31}
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
                <Button type="submit" variant="primary" size="sm">
                  Salvar
                </Button>
                <Button size="sm" onClick={() => setFormOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        </DrawerBackdrop>
      )}

      <Panel className="p-4 space-y-2">
        <SectionTitle>Horizonte de projeção</SectionTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            className="w-auto"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
          >
            {HORIZONS.map((h) => (
              <option key={h} value={h}>
                {h} dias
              </option>
            ))}
          </Select>
          <Button size="sm" onClick={saveHorizon}>
            Salvar horizonte
          </Button>
        </div>
        {def && (
          <p className="text-[11px] text-muted">
            Conta padrão para Quick Add: <strong>{def.nome}</strong>
          </p>
        )}
      </Panel>
    </div>
  );
}
