"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { Num } from "@/components/ui/Num";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { computeSavingsDemo } from "@/lib/marketing/savingsDemo";
import { formatBRL } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import {
  WEALTH_META_DEFAULT,
  WEALTH_META_MAX,
  WEALTH_META_MIN,
  WEALTH_META_STEP,
} from "@/lib/wealth";
import { SavingsMode } from "@/lib/types";

function parseMoney(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

export function ReservaPouparCalculator() {
  const [renda, setRenda] = useState("");
  const [custos, setCustos] = useState("");
  const [gastoVariavel, setGastoVariavel] = useState("");
  const [fatura, setFatura] = useState("");
  const [modo, setModo] = useState<SavingsMode>("percent");
  const [percentual, setPercentual] = useState(WEALTH_META_DEFAULT);
  const [valorFixo, setValorFixo] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    if (!submitted) return null;

    const poupanca =
      modo === "percent"
        ? { modo: "percent" as const, percentual }
        : (() => {
            const valor = parseMoney(valorFixo);
            if (valor <= 0) return null;
            return { modo: "fixed" as const, valorMensal: valor };
          })();

    return computeSavingsDemo({
      rendaMensal: parseMoney(renda),
      custoFixoMensal: parseMoney(custos),
      gastoVariavelMes: parseMoney(gastoVariavel),
      faturaAbertaCartao: parseMoney(fatura),
      poupanca,
    });
  }, [
    submitted,
    renda,
    custos,
    gastoVariavel,
    fatura,
    modo,
    percentual,
    valorFixo,
  ]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    trackEvent({ name: "marketing_tool_calculated", tool: "reserva_poupar" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-[var(--shadow-card)]">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Renda mensal (R$)</span>
          <MoneyInput value={renda} onChange={setRenda} required />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Custos fixos do mês (R$)</span>
          <span className="text-caption text-muted block">
            Aluguel, condomínio, assinaturas — o que não muda fácil.
          </span>
          <MoneyInput value={custos} onChange={setCustos} required />
        </label>

        <div className="space-y-3 border-t border-border/60 pt-4">
          <span className="text-sm font-medium">Reserva para poupar</span>
          <SegmentedControl<SavingsMode>
            size="sm"
            value={modo}
            onChange={setModo}
            options={[
              { value: "percent", label: "Percentual" },
              { value: "fixed", label: "Valor fixo" },
            ]}
          />
          {modo === "percent" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-caption text-muted">
                  Percentual da renda disponível
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {percentual}%
                </span>
              </div>
              <input
                type="range"
                min={WEALTH_META_MIN}
                max={WEALTH_META_MAX}
                step={WEALTH_META_STEP}
                value={percentual}
                onChange={(e) => setPercentual(Number(e.target.value))}
                className="w-full accent-[var(--foreground)]"
                aria-valuemin={WEALTH_META_MIN}
                aria-valuemax={WEALTH_META_MAX}
                aria-valuenow={percentual}
              />
              <div className="flex justify-between text-[10px] text-muted">
                <span>{WEALTH_META_MIN}%</span>
                <span>{WEALTH_META_MAX}%</span>
              </div>
            </div>
          ) : (
            <label className="block space-y-1">
              <span className="text-caption text-muted">Valor mensal (R$)</span>
              <MoneyInput value={valorFixo} onChange={setValorFixo} required />
            </label>
          )}
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Gasto variável já feito (R$)</span>
          <span className="text-caption text-muted block">
            Opcional — mercado, lazer, etc.
          </span>
          <MoneyInput value={gastoVariavel} onChange={setGastoVariavel} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Fatura aberta do cartão (R$)</span>
          <span className="text-caption text-muted block">
            Opcional — o que já fechou e vai pagar.
          </span>
          <MoneyInput value={fatura} onChange={setFatura} />
        </label>
        <Button type="submit" variant="primary" className="w-full rounded-xl h-11">
          Calcular reserva e limite
        </Button>
      </div>

      {result && (
        <div className="rounded-2xl border border-accent/30 bg-accent/8 p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted">Aporte mensal reservado</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-accent">
              <Num>{formatBRL(result.aporteMensal)}</Num>
            </p>
            {result.percentualEfetivo != null && modo === "fixed" && (
              <p className="mt-2 text-sm text-muted">
                Equivale a {result.percentualEfetivo}% da renda disponível
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-surface/80 p-4 text-center">
            <p className="text-sm text-muted">Limite diário após reserva</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              <Num>{formatBRL(result.diarioRestante)}</Num>
            </p>
            <p className="mt-2 text-sm text-muted">
              Sobra do mês: <Num>{formatBRL(result.sobraDoMes)}</Num> ·{" "}
              {result.diasRestantesMes} dia
              {result.diasRestantesMes === 1 ? "" : "s"} restante
              {result.diasRestantesMes === 1 ? "" : "s"}
            </p>
          </div>

          <p className="text-center text-sm text-muted">
            Aporte em 12 meses: <Num>{formatBRL(result.aporte12m)}</Num>
          </p>

          {result.reservaConsomeTodaRenda && (
            <p className="text-center text-sm text-muted leading-relaxed">
              Sua reserva consome toda a renda disponível para gasto — ajuste o
              percentual ou os custos fixos.
            </p>
          )}

          <p className="text-center text-sm">
            <Link
              href="/guias/como-poupar"
              className="text-accent underline underline-offset-2"
            >
              Entenda o passo a passo
            </Link>
          </p>
        </div>
      )}
    </form>
  );
}
