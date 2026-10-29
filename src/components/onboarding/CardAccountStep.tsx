"use client";

import { useRef, useState } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { IntegerInput } from "@/components/ui/IntegerInput";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { createDefaultAccount } from "@/lib/accounts";
import { hasCardAccount } from "@/lib/setupStatus";
import { useAppStore } from "@/lib/store";
import type { Account } from "@/lib/types";
import { RequiredNote, StepIntro } from "./wizardBits";

type FonteChoice = "inter" | "nubank" | "outro";

type Props = {
  onBack: () => void;
  onContinue: () => void;
};

const FONTE_NOME: Record<Exclude<FonteChoice, "outro">, string> = {
  inter: "Inter",
  nubank: "Nubank",
};

function defaultNome(fonte: FonteChoice, current: string): string {
  if (fonte === "outro") return current === "Inter" || current === "Nubank" ? "" : current;
  if (!current || current === "Inter" || current === "Nubank") return FONTE_NOME[fonte];
  return current;
}

export function CardAccountStep({ onBack, onContinue }: Props) {
  const { accounts, addAccount } = useAppStore();
  const cards = accounts.filter((a) => a.ativa && a.kind === "cartao");
  const canContinue = hasCardAccount(accounts);

  const [fonte, setFonte] = useState<FonteChoice>("inter");
  const [nome, setNome] = useState("Inter");
  const [fechamento, setFechamento] = useState("10");
  const [pagamento, setPagamento] = useState("20");
  const [teto, setTeto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [showForm, setShowForm] = useState(() => cards.length === 0);

  async function save() {
    if (savingRef.current) return;
    if (!nome.trim()) {
      setError("Dê um nome ao cartão.");
      return;
    }
    const diaFechamento = Number(fechamento);
    const diaPagamento = Number(pagamento);
    if (
      !Number.isInteger(diaFechamento) ||
      diaFechamento < 1 ||
      diaFechamento > 31
    ) {
      setError("Dia de fechamento deve ser entre 1 e 31.");
      return;
    }
    if (
      !Number.isInteger(diaPagamento) ||
      diaPagamento < 1 ||
      diaPagamento > 31
    ) {
      setError("Dia de pagamento deve ser entre 1 e 31.");
      return;
    }

    let limiteMensal: number | undefined;
    if (teto.trim()) {
      const n = Number(teto.replace(/\./g, "").replace(",", "."));
      if (Number.isNaN(n) || n <= 0) {
        setError("Teto mensal inválido.");
        return;
      }
      limiteMensal = n;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    const firstCard = cards.length === 0;
    try {
      const partial: Partial<Account> = {
        diaFechamento,
        diaPagamento,
        cicloConfirmado: true,
      };
      if (fonte === "inter" || fonte === "nubank") {
        partial.fonteCsv = fonte;
      }
      if (limiteMensal != null) partial.limiteMensal = limiteMensal;
      await addAccount(createDefaultAccount("cartao", nome.trim(), partial));
      if (firstCard) {
        onContinue();
        return;
      }
      setShowForm(false);
      setTeto("");
      setFonte("nubank");
      setNome("Nubank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <StepIntro
        icon={<CreditCard size={24} />}
        iconClassName="bg-[color-mix(in_oklab,var(--cat-4)_14%,transparent)] text-cat-4"
        title="Cartão de crédito"
        subtitle="Fecha e paga em que dia? Assim a fatura entra no saldo certo"
      />

      <p className="text-sm leading-relaxed text-muted">
        Inter e Nubank: o app lê a fatura que você exportar desses bancos.
        Outro cartão também vale — aí os gastos entram na mão.
      </p>

      {cards.length > 0 && (
        <ul className="space-y-2 rounded-2xl border border-border bg-surface p-3">
          {cards.map((a) => (
            <li key={a.id} className="text-sm">
              <span className="font-medium">{a.nome}</span>
              <span className="ml-2 text-xs text-muted">
                fecha dia {a.diaFechamento ?? "—"} · paga dia{" "}
                {a.diaPagamento ?? "—"}
                {a.fonteCsv
                  ? ` · fatura do ${FONTE_NOME[a.fonteCsv]}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!canContinue && (
        <RequiredNote>
          Cadastre ao menos um cartão para continuar — Inter, Nubank ou outro.
        </RequiredNote>
      )}

      {showForm ? (
        <form
          className="space-y-3 rounded-2xl border border-border bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="block space-y-1">
            <span className="text-xs text-muted">Qual cartão</span>
            <Select
              value={fonte}
              onChange={(e) => {
                const next = e.target.value as FonteChoice;
                setFonte(next);
                setNome((current) => defaultNome(next, current));
              }}
            >
              <option value="inter">Inter</option>
              <option value="nubank">Nubank</option>
              <option value="outro">Outro</option>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Nome</span>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-xs text-muted">Dia fechamento</span>
              <IntegerInput
                min={1}
                max={31}
                value={fechamento}
                onChange={setFechamento}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Dia pagamento</span>
              <IntegerInput
                min={1}
                max={31}
                value={pagamento}
                onChange={setPagamento}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Teto mensal (opcional)</span>
            <MoneyInput
              value={teto}
              onChange={setTeto}
              placeholder="Sem teto"
            />
          </label>
          {error && (
            <p className="text-xs text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              className="h-10 flex-1 rounded-xl"
              disabled={saving}
            >
              Salvar cartão
            </Button>
            {canContinue && (
              <Button
                className="h-10 rounded-xl"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      ) : (
        <Button
          className="h-10 w-full rounded-xl"
          onClick={() => setShowForm(true)}
        >
          Adicionar outro cartão
        </Button>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Button
          variant="primary"
          className="h-10 rounded-xl"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Continuar
        </Button>
        <Button className="h-10 rounded-xl px-5" onClick={onBack}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
      </div>
    </div>
  );
}
