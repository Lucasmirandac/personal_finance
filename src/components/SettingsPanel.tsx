"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BalanceAnchor,
  CardConfig,
  Fonte,
  Settings,
} from "@/lib/types";
import { defaultCardsForSources } from "@/lib/projection";

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
    <form onSubmit={handleSubmit} className="panel p-4 space-y-4">
      <div>
        <div className="section-title">Saldo inicial</div>
        <p className="text-[11px] subtle mt-0.5 mb-2">
          Saldo em conta na data de referência (âncora da projeção).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-title block mb-1" htmlFor="anchor-valor">
              Valor (R$)
            </label>
            <input
              id="anchor-valor"
              className="input num"
              type="text"
              inputMode="decimal"
              placeholder="5000,00"
              value={anchorValor}
              onChange={(e) => setAnchorValor(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="section-title block mb-1" htmlFor="anchor-data">
              Data
            </label>
            <input
              id="anchor-data"
              className="input"
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
          <div className="section-title">Cartões</div>
          <p className="text-[11px] subtle mt-0.5 mb-2">
            Fechamento = último dia da fatura; pagamento = débito na conta.
          </p>
          <div className="space-y-3">
            {cards.map((c) => (
              <div
                key={c.fonte}
                className="grid grid-cols-3 gap-2 items-end border border-[var(--border)] rounded-md p-2"
              >
                <div className="font-medium text-sm">{FONTE_LABELS[c.fonte]}</div>
                <div>
                  <label className="text-[10px] subtle uppercase tracking-wide">
                    Fechamento
                  </label>
                  <input
                    className="input mt-0.5"
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
                  <label className="text-[10px] subtle uppercase tracking-wide">
                    Pagamento
                  </label>
                  <input
                    className="input mt-0.5"
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
        <label className="section-title block mb-1" htmlFor="horizon">
          Horizonte (dias à frente)
        </label>
        <select
          id="horizon"
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
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn btn-primary">
          Salvar
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
