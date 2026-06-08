"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { IntegerInput } from "@/components/ui/IntegerInput";
import { Button } from "@/components/ui/Button";
import { Num } from "@/components/ui/Num";
import { simulateAffordLite } from "@/lib/marketing/affordDemo";
import { AFFORD_SEMAFORO_COPY } from "@/lib/afford";
import { formatBRL } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";

function parseMoney(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

const SEMAFORO_CLASS = {
  verde: "border-success/40 bg-success/10 text-success",
  amarelo: "border-warning/40 bg-warning/10 text-warning",
  vermelho: "border-danger/40 bg-danger/10 text-danger",
} as const;

export function PossoComprarCalculator() {
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [renda, setRenda] = useState("");
  const [saldo, setSaldo] = useState("");
  const [orcamento, setOrcamento] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => {
    if (!submitted) return null;
    return simulateAffordLite({
      valor: parseMoney(valor),
      parcelas: Number(parcelas) || 1,
      rendaDisponivel: parseMoney(renda),
      saldoAtual: parseMoney(saldo),
      orcamentoMensalRestante: orcamento.trim()
        ? parseMoney(orcamento)
        : undefined,
    });
  }, [submitted, valor, parcelas, renda, saldo, orcamento]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    trackEvent({ name: "marketing_tool_calculated", tool: "posso_comprar" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-[var(--shadow-card)]">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Valor da compra (R$)</span>
          <MoneyInput value={valor} onChange={setValor} required />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Parcelas</span>
          <IntegerInput
            min={1}
            max={24}
            value={parcelas}
            onChange={setParcelas}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Renda disponível no mês (R$)</span>
          <span className="text-caption text-muted block">
            Renda − custos fixos (sobra mensal).
          </span>
          <MoneyInput value={renda} onChange={setRenda} required />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Saldo em conta hoje (R$)</span>
          <MoneyInput value={saldo} onChange={setSaldo} required />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Orçamento da categoria restante (R$)</span>
          <span className="text-caption text-muted block">Opcional</span>
          <MoneyInput value={orcamento} onChange={setOrcamento} />
        </label>
        <Button type="submit" variant="primary" className="w-full rounded-xl h-11">
          Simular
        </Button>
      </div>

      {result && (
        <div
          className={clsx(
            "rounded-2xl border p-6",
            SEMAFORO_CLASS[result.semaforo],
          )}
        >
          <p className="text-lg font-semibold">
            {AFFORD_SEMAFORO_COPY[result.semaforo].title}
          </p>
          <p className="mt-1 text-sm opacity-90">
            Parcela: <Num>{formatBRL(result.valorParcela)}</Num>/mês
          </p>
          <ul className="mt-4 space-y-1.5 text-sm">
            {result.motivos.map((m) => (
              <li key={m}>• {m}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
