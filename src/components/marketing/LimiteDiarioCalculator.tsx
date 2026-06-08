"use client";

import { useMemo, useState } from "react";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Button } from "@/components/ui/Button";
import { Num } from "@/components/ui/Num";
import { computeDailyAllowanceFromManual } from "@/lib/marketing/dailyAllowanceDemo";
import { formatBRL } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";

function parseMoney(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

export function LimiteDiarioCalculator() {
  const [renda, setRenda] = useState("");
  const [custos, setCustos] = useState("");
  const [gastoVariavel, setGastoVariavel] = useState("");
  const [fatura, setFatura] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    if (!submitted) return null;
    return computeDailyAllowanceFromManual({
      rendaMensal: parseMoney(renda),
      custoFixoMensal: parseMoney(custos),
      gastoVariavelMes: parseMoney(gastoVariavel),
      faturaAbertaCartao: parseMoney(fatura),
    });
  }, [submitted, renda, custos, gastoVariavel, fatura]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    trackEvent({ name: "marketing_tool_calculated", tool: "limite_diario" });
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
        <label className="block space-y-1">
          <span className="text-sm font-medium">Gasto variável já feito (R$)</span>
          <span className="text-caption text-muted block">Opcional — mercado, lazer, etc.</span>
          <MoneyInput value={gastoVariavel} onChange={setGastoVariavel} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Fatura aberta do cartão (R$)</span>
          <span className="text-caption text-muted block">Opcional — o que já fechou e vai pagar.</span>
          <MoneyInput value={fatura} onChange={setFatura} />
        </label>
        <Button type="submit" variant="primary" className="w-full rounded-xl h-11">
          Calcular limite diário
        </Button>
      </div>

      {result && (
        <div className="rounded-2xl border border-accent/30 bg-accent/8 p-6 text-center">
          <p className="text-sm text-muted">Você pode gastar por dia até o fim do mês</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-accent">
            <Num>{formatBRL(result.diarioRestante)}</Num>
          </p>
          <p className="mt-3 text-sm text-muted">
            Sobra do mês: <Num>{formatBRL(result.sobraDoMes)}</Num> ·{" "}
            {result.diasRestantesMes} dia
            {result.diasRestantesMes === 1 ? "" : "s"} restante
            {result.diasRestantesMes === 1 ? "" : "s"}
          </p>
          {result.tetoCartaoRecomendado > 0 && (
            <p className="mt-2 text-caption text-muted">
              Teto seguro para novos gastos no cartão:{" "}
              <Num>{formatBRL(result.tetoCartaoRecomendado)}</Num>
            </p>
          )}
        </div>
      )}
    </form>
  );
}
