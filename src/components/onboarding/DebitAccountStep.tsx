"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Num } from "@/components/ui/Num";
import { ACCOUNT_KIND_LABELS, createDefaultAccount } from "@/lib/accounts";
import { todayIso } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { hasCashAccount } from "@/lib/setupStatus";
import { useAppStore } from "@/lib/store";
import { RequiredNote, StepIntro } from "./wizardBits";

type Props = {
  onBack: () => void;
  onContinue: () => void;
};

function parseSaldo(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  const n = Number(trimmed.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export function DebitAccountStep({ onBack, onContinue }: Props) {
  const { accounts, addAccount } = useAppStore();
  const cash = accounts.filter((a) => a.ativa && a.kind !== "cartao");
  const canContinue = hasCashAccount(accounts);

  const [nome, setNome] = useState("Carteira");
  const [saldo, setSaldo] = useState("");
  const [dataRef, setDataRef] = useState(() => todayIso());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  async function save(thenContinue: boolean) {
    if (savingRef.current) return;
    const trimmedNome = nome.trim();
    if (!trimmedNome) {
      setError("Dê um nome à conta.");
      return;
    }
    if (
      cash.some(
        (a) => a.nome.trim().toLowerCase() === trimmedNome.toLowerCase(),
      )
    ) {
      setError("Já existe uma conta com esse nome.");
      return;
    }
    const valor = parseSaldo(saldo);
    if (valor == null) {
      setError("Saldo inválido. Use só números, como 1500 ou 1.500,00.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
        const acc = createDefaultAccount("carteira", trimmedNome, {
          saldoInicial: valor,
          dataReferencia: dataRef || todayIso(),
          isDefault: cash.length === 0,
        });
      await addAccount(acc);
      if (thenContinue) onContinue();
      else setNome("");
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
        icon={<Wallet size={24} />}
        iconClassName="bg-info/12 text-info"
        title="Conta de débito"
        subtitle="O saldo de hoje começa aqui: carteira, corrente ou poupança"
      />

      <p className="text-sm leading-relaxed text-muted">
        Carteira, corrente ou poupança. O valor é o que você tem agora, não o
        orçado do mês.
      </p>

      {cash.length > 0 && (
        <ul className="space-y-2 rounded-2xl border border-border bg-surface p-3">
          {cash.map((a) => (
            <li key={a.id} className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">
                {a.nome}
                <span className="ml-2 text-xs font-normal text-muted">
                  {ACCOUNT_KIND_LABELS[a.kind]}
                </span>
              </span>
              <Num className="text-sm tabular-nums">{formatBRL(a.saldoInicial)}</Num>
            </li>
          ))}
        </ul>
      )}

      {!canContinue && (
        <RequiredNote>
          Cadastre ao menos uma conta de saldo (carteira, corrente ou poupança)
          para continuar.
        </RequiredNote>
      )}

      <form
        className="space-y-3 rounded-2xl border border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save(!canContinue);
        }}
      >
        <label className="block space-y-1">
          <span className="text-xs text-muted">Nome</span>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          {error &&
            (error.includes("nome") || error.includes("Já existe")) && (
              <p className="text-xs text-danger" role="alert">
                {error}
              </p>
            )}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-xs text-muted">Saldo atual (R$)</span>
            <MoneyInput
              value={saldo}
              onChange={setSaldo}
              placeholder="0,00"
            />
            {error && error.includes("Saldo") && (
              <p className="text-xs text-danger" role="alert">
                {error}
              </p>
            )}
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Nesta data</span>
            <Input
              type="date"
              value={dataRef}
              onChange={(e) => setDataRef(e.target.value)}
            />
          </label>
        </div>
        {error &&
          !error.includes("nome") &&
          !error.includes("Já existe") &&
          !error.includes("Saldo") && (
            <p className="text-xs text-danger" role="alert">
              {error}
            </p>
          )}
        {!canContinue ? (
          <Button
            type="submit"
            variant="primary"
            className="h-10 w-full rounded-xl"
            disabled={saving}
          >
            Salvar e continuar
          </Button>
        ) : (
          <Button
            type="submit"
            className="h-10 w-full rounded-xl"
            disabled={saving}
          >
            Adicionar outra conta
          </Button>
        )}
      </form>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        {canContinue && (
          <Button
            variant="primary"
            className="h-10 rounded-xl"
            onClick={onContinue}
          >
            Continuar
          </Button>
        )}
        <Button className="h-10 rounded-xl px-5" onClick={onBack}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
      </div>
    </div>
  );
}
