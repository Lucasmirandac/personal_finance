"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BalanceAnchor,
  CardConfig,
  Fonte,
  Settings,
} from "@/lib/types";
import { defaultCardsForSources } from "@/lib/projection";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { SectionTitle } from "@/components/ui/SectionTitle";

const FONTE_LABELS: Record<Fonte, string> = {
  inter: "Inter",
  nubank: "Nubank",
  manual: "Manual",
};

const HORIZONS = [30, 60, 90, 180] as const;

type Props = {
  settings: Settings;
  cardSources: Fonte[];
  onSave: (settings: Settings) => void | Promise<void>;
  onCancel?: () => void;
};

export function SettingsPanel({
  settings,
  cardSources,
  onSave,
  onCancel,
}: Props) {
  const sources = useMemo(
    () => cardSources.filter((f) => f === "inter" || f === "nubank"),
    [cardSources],
  );

  const [anchorDate, setAnchorDate] = useState(
    settings.balanceAnchor?.data ?? new Date().toISOString().slice(0, 10),
  );
  const [anchorValor, setAnchorValor] = useState(
    settings.balanceAnchor?.valor?.toString() ?? "",
  );
  const [horizon, setHorizon] = useState(settings.projectionHorizonDays);
  const [cards, setCards] = useState<CardConfig[]>(() => {
    if (settings.cards.length > 0) return settings.cards;
    return defaultCardsForSources(sources);
  });

  useEffect(() => {
    setAnchorDate(
      settings.balanceAnchor?.data ?? new Date().toISOString().slice(0, 10),
    );
    setAnchorValor(settings.balanceAnchor?.valor?.toString() ?? "");
    setHorizon(settings.projectionHorizonDays);
    if (settings.cards.length > 0) {
      setCards(settings.cards);
    } else {
      setCards(defaultCardsForSources(sources));
    }
  }, [settings, sources]);

  useEffect(() => {
    setCards((prev) => {
      const byFonte = new Map(prev.map((c) => [c.fonte, c]));
      return sources.map((fonte) => {
        const existing = byFonte.get(fonte);
        return (
          existing ?? {
            fonte,
            diaFechamento: 10,
            diaPagamento: 20,
          }
        );
      });
    });
  }, [sources]);

  function updateCard(fonte: Fonte, field: "diaFechamento" | "diaPagamento", v: number) {
    setCards((prev) =>
      prev.map((c) =>
        c.fonte === fonte ? { ...c, [field]: Math.min(31, Math.max(1, v)) } : c,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valor = parseFloat(anchorValor.replace(",", "."));
    if (Number.isNaN(valor)) return;
    const balanceAnchor: BalanceAnchor = { data: anchorDate, valor };
    await onSave({
      balanceAnchor,
      cards,
      projectionHorizonDays: horizon,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-lg p-4 space-y-4"
    >
      <div>
        <SectionTitle>Saldo inicial</SectionTitle>
        <p className="text-[11px] text-muted mt-0.5 mb-2">
          Saldo em conta na data de referência (âncora da projeção).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="text-[11px] font-semibold tracking-wider uppercase text-muted block mb-1"
              htmlFor="anchor-valor"
            >
              Valor (R$)
            </label>
            <Input
              id="anchor-valor"
              className="font-mono tabular-nums"
              type="text"
              inputMode="decimal"
              placeholder="5000,00"
              value={anchorValor}
              onChange={(e) => setAnchorValor(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              className="text-[11px] font-semibold tracking-wider uppercase text-muted block mb-1"
              htmlFor="anchor-data"
            >
              Data
            </label>
            <Input
              id="anchor-data"
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {sources.length > 0 && (
        <div>
          <SectionTitle>Cartões</SectionTitle>
          <p className="text-[11px] text-muted mt-0.5 mb-2">
            Fechamento = último dia da fatura; pagamento = débito na conta.
          </p>
          <div className="space-y-3">
            {cards.map((c) => (
              <div
                key={c.fonte}
                className="grid grid-cols-3 gap-2 items-end border border-border rounded-md p-2"
              >
                <div className="font-medium text-sm">{FONTE_LABELS[c.fonte]}</div>
                <div>
                  <label
                    className="text-[10px] text-muted uppercase tracking-wide"
                    htmlFor={`card-fechamento-${c.fonte}`}
                  >
                    Fechamento
                  </label>
                  <Input
                    id={`card-fechamento-${c.fonte}`}
                    className="mt-0.5"
                    type="number"
                    min={1}
                    max={31}
                    value={c.diaFechamento}
                    onChange={(e) =>
                      updateCard(c.fonte, "diaFechamento", Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] text-muted uppercase tracking-wide"
                    htmlFor={`card-pagamento-${c.fonte}`}
                  >
                    Pagamento
                  </label>
                  <Input
                    id={`card-pagamento-${c.fonte}`}
                    className="mt-0.5"
                    type="number"
                    min={1}
                    max={31}
                    value={c.diaPagamento}
                    onChange={(e) =>
                      updateCard(c.fonte, "diaPagamento", Number(e.target.value))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label
          className="text-[11px] font-semibold tracking-wider uppercase text-muted block mb-1"
          htmlFor="horizon"
        >
          Horizonte (dias à frente)
        </label>
        <Select
          id="horizon"
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
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary">
          Salvar
        </Button>
        {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  );
}
