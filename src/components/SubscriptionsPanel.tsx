"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useAppStore } from "@/lib/store";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  detectSubscriptions,
  suggestionToRecurring,
} from "@/lib/subscriptions";
import { Sparkles } from "lucide-react";

const PAGE_SIZE = 8;

export function SubscriptionsPanel() {
  const {
    hasAnalysis,
    normalized,
    recurringRules,
    subscriptionDismissals,
    addRecurring,
    dismissSubscription,
  } = useAppStore();

  const [showAll, setShowAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const suggestions = useMemo(
    () =>
      detectSubscriptions(
        normalized,
        recurringRules,
        subscriptionDismissals,
      ),
    [normalized, recurringRules, subscriptionDismissals],
  );

  const visible = showAll ? suggestions : suggestions.slice(0, PAGE_SIZE);

  if (!hasAnalysis) return null;

  return (
    <section className="panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--warning)]" />
            <h2 className="text-sm font-semibold">Assinaturas detectadas</h2>
            {suggestions.length > 0 && (
              <span className="chip">{suggestions.length}</span>
            )}
          </div>
          <p className="subtle text-xs mt-0.5 max-w-xl">
            Gastos mensais estáveis nos últimos 6 meses. Converta em despesa fixa
            com um clique.
          </p>
        </div>
      </div>

      {toast && (
        <p className="text-xs text-[var(--success)] border border-[var(--success)]/30 rounded-md px-2 py-1.5">
          {toast}
        </p>
      )}

      {suggestions.length === 0 ? (
        <p className="text-sm subtle">
          Nada detectado nos últimos 6 meses.
        </p>
      ) : (
        <>
          <p className="text-sm">
            Achei{" "}
            <span className="font-medium">
              {suggestions.length} assinatura
              {suggestions.length > 1 ? "s" : ""}
            </span>{" "}
            que talvez você queira virar Despesa fixa:{" "}
            <span className="subtle">
              {suggestions
                .slice(0, 4)
                .map((s) => s.estabelecimento)
                .join(", ")}
              {suggestions.length > 4 ? "…" : ""}
            </span>
          </p>

          <ul className="space-y-2">
            {visible.map((s) => (
              <li
                key={s.key}
                className="border border-[var(--border)] rounded-lg p-3 space-y-2 bg-[var(--surface)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{s.estabelecimento}</span>
                  <span className="chip num">{formatBRL(s.valorMediano)}/mês</span>
                  <span className="chip text-[10px]">±{s.variacaoPct.toFixed(1)}%</span>
                </div>
                <p className="text-xs subtle">
                  Visto em {s.meses.length} meses · último em{" "}
                  {formatDateBR(s.ultimaData)} · {s.categoria}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={clsx(
                      "btn btn-primary btn-sm",
                      busyKey === s.key && "opacity-60",
                    )}
                    disabled={busyKey !== null}
                    onClick={async () => {
                      setBusyKey(s.key);
                      try {
                        await addRecurring(suggestionToRecurring(s));
                        setToast("Adicionada a Recorrentes.");
                        setTimeout(() => setToast(null), 3000);
                      } finally {
                        setBusyKey(null);
                      }
                    }}
                  >
                    Virar despesa fixa
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busyKey !== null}
                    onClick={() => dismissSubscription(s.key)}
                  >
                    Dispensar
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {suggestions.length > PAGE_SIZE && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Mostrar menos" : `Mostrar mais (${suggestions.length - PAGE_SIZE})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
