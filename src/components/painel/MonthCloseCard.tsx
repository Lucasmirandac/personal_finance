"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Num } from "@/components/ui/Num";
import { formatBRL } from "@/lib/format";
import {
  buildMonthCloseEntry,
  computeMonthCloseSummary,
  getOldestPendingClose,
} from "@/lib/monthClose";
import { useAppStore } from "@/lib/store";

function formatCloseMonthTitle(anoMes: string): string {
  const [y, m] = anoMes.split("-").map(Number);
  if (!y || !m) return anoMes;
  const label = new Date(Date.UTC(y, m - 1, 15, 12, 0, 0, 0)).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function CategoryList({
  title,
  items,
  tone,
}: Readonly<{
  title: string;
  items: Array<{
    categoria: string;
    gasto: number;
    limite: number;
    percentual: number;
  }>;
  tone: "danger" | "success";
}>) {
  if (items.length === 0) {
    return (
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {title}
        </p>
        <p className="mt-2 text-xs text-muted">Nenhuma categoria nesta faixa.</p>
      </div>
    );
  }

  return (
    <div>
      <p
        className={clsx(
          "text-[11px] font-medium uppercase tracking-wider",
          tone === "danger" ? "text-danger" : "text-success",
        )}
      >
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.categoria} className="text-xs text-foreground">
            <span className="font-medium">{item.categoria}</span>
            <span className="text-muted">
              {" "}
              · {formatBRL(item.gasto)} / {formatBRL(item.limite)} ({item.percentual}
              %)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MonthCloseCard() {
  const {
    normalized,
    recurringRules,
    accounts,
    structuralCategories,
    budgets,
    monthCloses,
    closeMonth,
  } = useAppStore();
  const [busy, setBusy] = useState(false);

  const pendingAnoMes = useMemo(
    () => getOldestPendingClose(normalized, monthCloses),
    [normalized, monthCloses],
  );

  const summary = useMemo(() => {
    if (!pendingAnoMes) return null;
    return computeMonthCloseSummary({
      anoMes: pendingAnoMes,
      normalized,
      recurringRules,
      accounts,
      structuralCategories,
      budgets,
    });
  }, [
    pendingAnoMes,
    normalized,
    recurringRules,
    accounts,
    structuralCategories,
    budgets,
  ]);

  if (!pendingAnoMes || !summary) return null;

  const positive = summary.sobra > 0;
  const showSobraEmpty =
    summary.sobra === 0 && !summary.temRendaCadastrada;

  const handleClose = async () => {
    setBusy(true);
    try {
      await closeMonth(buildMonthCloseEntry(summary));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="rounded-3xl p-5 shadow-[var(--shadow-card-lg)] ring-1 ring-border/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
            Fechamento
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            {formatCloseMonthTitle(pendingAnoMes)}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Revise o mês anterior antes de seguir com o dia a dia.
          </p>
        </div>
      </div>

      <div className="mt-5">
        {showSobraEmpty ? (
          <p className="text-sm text-muted">
            Cadastre renda em{" "}
            <Link href="/config" className="font-medium text-accent underline-offset-2 hover:underline">
              Configurações
            </Link>{" "}
            para ver a sobra do mês.
          </p>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">
              {positive ? "Sobra do mês" : "Déficit do mês"}
            </p>
            <p
              className={clsx(
                "mt-1 text-3xl font-semibold tracking-tight",
                positive ? "text-success" : "text-danger",
              )}
            >
              <Num className="font-mono tabular-nums num-display">
                {formatBRL(summary.sobra)}
              </Num>
            </p>
            <p className="mt-1 text-sm text-muted">
              {positive
                ? `Sobrou ${formatBRL(summary.sobra)} no orçamento disponível.`
                : `Fechou negativo em ${formatBRL(Math.abs(summary.sobra))}.`}
            </p>
          </div>
        )}
      </div>

      {summary.hasActiveBudgets ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <CategoryList
            title="Mais estouraram"
            items={summary.top3Estouro}
            tone="danger"
          />
          <CategoryList
            title="Mais sobraram"
            items={summary.top3Sobra}
            tone="success"
          />
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-surface-2 px-4 py-3">
          <p className="text-sm text-muted">
            Sem orçamentos para comparar ainda.
          </p>
          <Link
            href="/config?tab=orcamentos"
            className="mt-2 inline-flex items-center justify-center rounded-full border border-transparent px-2 py-1 text-xs font-medium text-foreground transition-[background,border-color] hover:border-border hover:bg-surface-2"
          >
            Criar orçamento
          </Link>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-border/60 bg-surface-2/60 px-4 py-3">
        {summary.sugestao.tipo === "criar_orcamento" && (
          <p className="text-sm text-foreground">
            Crie orçamentos por categoria para receber sugestões no próximo
            fechamento.
          </p>
        )}
        {summary.sugestao.tipo === "manter" && (
          <p className="text-sm text-foreground">Manter assim?</p>
        )}
        {summary.sugestao.tipo === "aumentar_limite" && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-foreground">
              Aumentar limite de{" "}
              <span className="font-medium">{summary.sugestao.categoria}</span> em{" "}
              {formatBRL(summary.sugestao.deltaSugerido)}?
            </p>
            <Link
              href="/config?tab=orcamentos"
              className="inline-flex items-center justify-center rounded-full border border-transparent px-2 py-1 text-xs font-medium text-foreground transition-[background,border-color] hover:border-border hover:bg-surface-2"
            >
              Ajustar
            </Link>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="primary"
          className="rounded-full"
          disabled={busy}
          onClick={() => void handleClose()}
        >
          {busy ? "Salvando…" : "Fechar mês"}
        </Button>
      </div>
    </Panel>
  );
}
