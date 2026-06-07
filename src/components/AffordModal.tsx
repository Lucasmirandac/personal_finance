"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { defaultAccount } from "@/lib/accounts";
import {
  AFFORD_PARCELAS_MAX,
  AFFORD_SEMAFORO_COPY,
  simulateAffordability,
} from "@/lib/afford";
import { uniqueCategoriesFromTransactions } from "@/lib/budgets";
import { parseBrlValue, isoToBr } from "@/lib/csv";
import { todayIso } from "@/lib/dates";
import { formatBRL } from "@/lib/format";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useAppStore, QuickAddDraft } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Input, Select } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Num } from "@/components/ui/Num";
import { LabelWithInfo } from "@/components/ui/LabelWithInfo";
import { g } from "@/lib/glossary";

type Props = {
  open: boolean;
  onClose: () => void;
  onRegisterGasto?: (draft: QuickAddDraft) => void;
};

function formatMeses(meses: number): string {
  return `${meses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${Math.abs(meses - 1) < 0.05 ? "mês" : "meses"}`;
}

export function AffordModal({ open, onClose, onRegisterGasto }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const valorRef = useRef<HTMLInputElement>(null);
  const {
    accounts,
    normalized,
    budgets,
    recurringRules,
    settings,
    structuralCategories,
  } = useAppStore();

  const [valorStr, setValorStr] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [categoria, setCategoria] = useState("");
  const [accountId, setAccountId] = useState("");
  const [dataIso, setDataIso] = useState(todayIso());

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.ativa),
    [accounts],
  );

  const categoryList = useMemo(
    () => uniqueCategoriesFromTransactions(normalized),
    [normalized],
  );

  const parsedValor = useMemo(() => {
    return (
      parseBrlValue(valorStr) ??
      (Number(valorStr.replace(",", ".")) || null)
    );
  }, [valorStr]);

  const selectedAccount = useMemo(
    () => activeAccounts.find((a) => a.id === accountId),
    [activeAccounts, accountId],
  );

  const result = useMemo(() => {
    if (parsedValor === null || parsedValor <= 0 || !accountId) return null;
    return simulateAffordability({
      draft: {
        valor: Math.abs(parsedValor),
        parcelas,
        categoria,
        accountId,
        dataIso,
      },
      normalized,
      recurringRules,
      settings,
      accounts,
      budgets,
      structuralCategories,
    });
  }, [
    parsedValor,
    parcelas,
    categoria,
    accountId,
    dataIso,
    normalized,
    recurringRules,
    settings,
    accounts,
    budgets,
    structuralCategories,
  ]);

  useEffect(() => {
    if (!open) return;
    const def = defaultAccount(accounts);
    setValorStr("");
    setParcelas(1);
    setCategoria("");
    setAccountId(def?.id ?? "");
    setDataIso(todayIso());
    setTimeout(() => valorRef.current?.focus(), 50);
  }, [open, accounts]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useFocusTrap(open, dialogRef);

  if (!open) return null;

  const semaforoCopy = result
    ? AFFORD_SEMAFORO_COPY[result.semaforo]
    : null;

  function handleRegister() {
    if (!onRegisterGasto || parsedValor === null || parsedValor <= 0) return;
    onRegisterGasto({
      valorOriginal: Math.abs(parsedValor),
      categoria: categoria.trim(),
      accountId,
      data: isoToBr(dataIso),
      tipo: "Avulso",
      lancamento: "Compra simulada",
      parcelas,
      amountMode: "total",
    });
    onClose();
  }

  return (
    <DrawerBackdrop
      className="flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-surface border border-border rounded-lg w-full max-w-md max-h-[90dvh] overflow-y-auto p-4 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="afford-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="afford-title"
              className="text-caption font-semibold tracking-wider uppercase text-muted"
            >
              <LabelWithInfo info={g("simulacaoAfford")} ariaTopic="Posso comprar isso">
                Posso comprar isso?
              </LabelWithInfo>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Simulação em tempo real — não cria transação.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            <X size={14} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1 col-span-2 sm:col-span-1">
            <span className="text-xs text-muted">Valor (R$)</span>
            <MoneyInput
              ref={valorRef}
              className="text-lg"
              placeholder="1.200,00"
              value={valorStr}
              onChange={setValorStr}
            />
          </label>

          <label className="block space-y-1 col-span-2 sm:col-span-1">
            <span className="text-xs text-muted">Parcelas</span>
            <Select
              value={String(parcelas)}
              onChange={(e) => setParcelas(Number(e.target.value))}
            >
              {Array.from({ length: AFFORD_PARCELAS_MAX }, (_, i) => i + 1).map(
                (n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ),
              )}
            </Select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">Categoria</span>
            <Input
              list="afford-categories"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Lazer, Transporte…"
            />
            <datalist id="afford-categories">
              {categoryList.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">Conta</span>
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                  {a.kind === "cartao" ? " (cartão)" : ""}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {selectedAccount && selectedAccount.kind !== "cartao" && parcelas > 1 && (
          <p className="text-xs text-warning border border-warning/30 rounded-md px-2 py-1.5">
            Parcelas em conta não-cartão são tratadas como {parcelas} retiradas
            mensais a partir de hoje.
          </p>
        )}

        {!result && (
          <p className="text-xs text-muted border border-border rounded-md px-2 py-1.5">
            Informe um valor válido para simular o impacto.
          </p>
        )}

        {result && semaforoCopy && (
          <>
            <div
              className={clsx(
                "rounded-md border px-3 py-2 space-y-1",
                result.semaforo === "verde" &&
                  "border-success/40 bg-success/5 text-success",
                result.semaforo === "amarelo" &&
                  "border-warning/40 bg-warning/5 text-warning",
                result.semaforo === "vermelho" &&
                  "border-danger/40 bg-danger/5 text-danger",
              )}
            >
              <p className="text-sm font-semibold">{semaforoCopy.title}</p>
              <ul className="text-xs space-y-0.5 list-disc pl-4 opacity-90">
                {result.motivos.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>

            {result.faturas.length > 0 && (
              <ImpactSection
                title={
                  result.isCartao
                    ? `Fatura (${result.faturas[0]?.accountNome ?? "cartão"})`
                    : `Saídas (${result.faturas[0]?.accountNome ?? "conta"})`
                }
              >
                <ul className="text-xs space-y-1">
                  {result.faturas.map((f, i) => (
                    <li key={`${f.payDate}-${i}`} className="flex justify-between gap-2">
                      <span>
                        {result.isCartao ? "Pagamento " : "Débito "}
                        {f.mesLabel}
                      </span>
                      <Num className="font-mono tabular-nums shrink-0">
                        + {formatBRL(f.valorParcela)}
                      </Num>
                    </li>
                  ))}
                </ul>
              </ImpactSection>
            )}

            {result.saldo30 && (
              <ImpactSection title="Saldo mínimo (30 dias)" info={g("menorSaldo")}>
                <p className="text-xs">
                  <Num className="font-mono tabular-nums">
                    {formatBRL(result.saldo30.menorAntes)}
                  </Num>
                  {" → "}
                  <Num className="font-mono tabular-nums font-medium">
                    {formatBRL(result.saldo30.menorDepois)}
                  </Num>
                  <span className="text-muted">
                    {" "}
                    em {isoToBr(result.saldo30.data)}
                  </span>
                </p>
              </ImpactSection>
            )}

            {result.saldo90 && (
              <ImpactSection title="Saldo mínimo (90 dias)" info={g("saldo90d")}>
                <p className="text-xs">
                  <Num className="font-mono tabular-nums">
                    {formatBRL(result.saldo90.menorAntes)}
                  </Num>
                  {" → "}
                  <Num className="font-mono tabular-nums font-medium">
                    {formatBRL(result.saldo90.menorDepois)}
                  </Num>
                  <span className="text-muted">
                    {" "}
                    em {isoToBr(result.saldo90.data)}
                  </span>
                </p>
              </ImpactSection>
            )}

            {result.budget && (
              <ImpactSection
                title={`Orçamento · ${result.budget.categoria}`}
                info={g("orcamentoCategoria")}
              >
                <p className="text-xs">
                  {result.budget.pctAntes.toFixed(0)}% →{" "}
                  <span
                    className={clsx(
                      result.budget.statusDepois === "danger" && "text-danger",
                      result.budget.statusDepois === "warning" && "text-warning",
                    )}
                  >
                    {result.budget.pctDepois.toFixed(0)}%
                  </span>
                  {" "}
                  (
                  <Num className="font-mono tabular-nums">
                    {formatBRL(result.budget.gastoDepois)}
                  </Num>
                  /
                  <Num className="font-mono tabular-nums">
                    {formatBRL(result.budget.limite)}
                  </Num>
                  )
                </p>
              </ImpactSection>
            )}

            {result.cardLimit && (
              <ImpactSection
                title={`Teto do cartão · ${result.cardLimit.accountNome}`}
                info={g("tetoCartaoDefinido")}
              >
                <p className="text-xs">
                  {result.cardLimit.pctAntes.toFixed(0)}% →{" "}
                  <span
                    className={clsx(
                      result.cardLimit.statusDepois === "danger" && "text-danger",
                      result.cardLimit.statusDepois === "warning" && "text-warning",
                    )}
                  >
                    {result.cardLimit.pctDepois.toFixed(0)}%
                  </span>
                  {" "}
                  (
                  <Num className="font-mono tabular-nums">
                    {formatBRL(result.cardLimit.gastoDepois)}
                  </Num>
                  /
                  <Num className="font-mono tabular-nums">
                    {formatBRL(result.cardLimit.limite)}
                  </Num>
                  )
                </p>
              </ImpactSection>
            )}

            {result.pazFutura && (
              <ImpactSection title="Paz Futura" info={g("tranquilidade")}>
                <p className="text-xs">
                  Em {result.pazFutura.labelMesReferencia}:{" "}
                  {formatMeses(result.pazFutura.mesesAntes)} →{" "}
                  {formatMeses(result.pazFutura.mesesDepois)}
                  {result.pazFutura.perdaMeses > 0 && (
                    <span className="text-muted">
                      {" "}
                      (−
                      {result.pazFutura.perdaMeses.toLocaleString("pt-BR", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      {Math.abs(result.pazFutura.perdaMeses - 1) < 0.05
                        ? "mês"
                        : "meses"}{" "}
                      de tranquilidade)
                    </span>
                  )}
                </p>
              </ImpactSection>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
          {onRegisterGasto && result && (
            <Button size="sm" onClick={handleRegister}>
              Registrar gasto com esses dados →
            </Button>
          )}
        </div>
      </div>
    </DrawerBackdrop>
  );
}

function ImpactSection({
  title,
  info,
  children,
}: {
  title: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-md px-3 py-2 space-y-1">
      <LabelWithInfo
        labelClassName="text-[10px] uppercase tracking-wider text-muted"
        info={info}
        ariaTopic={title}
      >
        {title}
      </LabelWithInfo>
      {children}
    </div>
  );
}
