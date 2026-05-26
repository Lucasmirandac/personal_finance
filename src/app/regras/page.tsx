"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { DEFAULT_RULES, Rules } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { formatBRL, formatInt } from "@/lib/format";
import { normalizeTransactions } from "@/lib/normalize";

export default function RegrasPage() {
  const { loaded, dataset, rules, updateRules, resetRules } = useAppStore();
  const [draft, setDraft] = useState<Rules>(rules);
  const [dirty, setDirty] = useState(false);
  const [storedRules, setStoredRules] = useState<Rules>(rules);
  if (storedRules !== rules) {
    setStoredRules(rules);
    setDraft(rules);
    setDirty(false);
  }

  const preview = useMemo(() => {
    if (!dataset) return null;
    const norm = normalizeTransactions(dataset.raw, draft);
    const gasto = norm.filter((t) => t.natureza === "Gasto");
    const pag = norm.filter((t) => t.natureza === "Pagamento de fatura");
    const est = norm.filter((t) => t.natureza === "Estorno / crédito");
    const total = gasto.reduce((acc, t) => acc + t.valorAnalise, 0);
    return {
      total,
      countGasto: gasto.length,
      countPag: pag.length,
      countEst: est.length,
      excludedSamples: [...pag, ...est].slice(0, 12),
    };
  }, [dataset, draft]);

  if (!loaded) return <div className="subtle">Carregando…</div>;
  if (!dataset)
    return (
      <EmptyState description="Importe um CSV para começar a editar as regras de classificação." />
    );

  function setPag(list: string[]) {
    setDraft({ ...draft, pagamentoPatterns: list });
    setDirty(true);
  }
  function setEst(list: string[]) {
    setDraft({ ...draft, estornoPatterns: list });
    setDirty(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Regras</h1>
          <p className="subtle text-sm">
            Padrões editáveis para classificar lançamentos. Mudanças recalculam
            todo o dataset.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (confirm("Restaurar padrões originais?")) {
                await resetRules();
              }
            }}
          >
            Restaurar padrões
          </button>
          <button
            className="btn"
            onClick={() => {
              setDraft(rules);
              setDirty(false);
            }}
            disabled={!dirty}
          >
            Descartar
          </button>
          <button
            className="btn btn-primary"
            onClick={async () => {
              await updateRules({
                pagamentoPatterns: draft.pagamentoPatterns.filter((p) => p.trim()),
                estornoPatterns: draft.estornoPatterns.filter((p) => p.trim()),
              });
            }}
            disabled={!dirty}
          >
            Salvar e recalcular
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PatternEditor
          title="Pagamento de fatura"
          description="Lançamentos contendo qualquer um destes padrões viram Pagamento de fatura (Valor análise = 0)."
          values={draft.pagamentoPatterns}
          onChange={setPag}
          placeholderItem="PAGAMENTO ON LINE"
          defaults={DEFAULT_RULES.pagamentoPatterns}
        />
        <PatternEditor
          title="Estorno / crédito"
          description="Lançamentos com valor negativo OU contendo qualquer um destes padrões viram Estorno/crédito (Valor análise = 0)."
          values={draft.estornoPatterns}
          onChange={setEst}
          placeholderItem="ESTORNO"
          defaults={DEFAULT_RULES.estornoPatterns}
        />
      </div>

      {preview && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-semibold">Pré-visualização do impacto</div>
            <div className="text-xs subtle">
              Calculado a partir do dataset atual. Salve para aplicar.
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              label="Gasto analisado"
              value={formatBRL(preview.total)}
            />
            <Stat label="Transações de consumo" value={formatInt(preview.countGasto)} />
            <Stat label="Pagamentos detectados" value={formatInt(preview.countPag)} />
            <Stat label="Estornos detectados" value={formatInt(preview.countEst)} />
          </div>
          {preview.excludedSamples.length > 0 && (
            <div>
              <div className="text-sm subtle mb-2">
                Exemplos de lançamentos excluídos com as regras atuais:
              </div>
              <div className="table-wrap">
                <table className="dt">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Lançamento</th>
                      <th>Natureza</th>
                      <th>Valor original</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.excludedSamples.map((t) => (
                      <tr key={t.id}>
                        <td>{t.data}</td>
                        <td className="max-w-[320px] truncate">{t.lancamento}</td>
                        <td>
                          <span
                            className={
                              t.natureza === "Pagamento de fatura"
                                ? "badge badge-pay"
                                : "badge badge-est"
                            }
                          >
                            {t.natureza}
                          </span>
                        </td>
                        <td>{formatBRL(t.valorOriginal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] p-3 border border-[var(--border)]">
      <div className="text-xs subtle">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function PatternEditor({
  title,
  description,
  values,
  onChange,
  placeholderItem,
  defaults,
}: {
  title: string;
  description: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholderItem: string;
  defaults: string[];
}) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (!v) return;
    if (values.some((x) => x.toUpperCase() === v.toUpperCase())) {
      setInput("");
      return;
    }
    onChange([...values, v]);
    setInput("");
  }

  function remove(idx: number) {
    const next = [...values];
    next.splice(idx, 1);
    onChange(next);
  }

  function setIdx(idx: number, v: string) {
    const next = [...values];
    next[idx] = v;
    onChange(next);
  }

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div>
        <div className="font-semibold">{title}</div>
        <p className="subtle text-sm">{description}</p>
      </div>
      <ul className="space-y-2">
        {values.map((v, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              className="input"
              value={v}
              onChange={(e) => setIdx(i, e.target.value)}
            />
            <button
              className="btn btn-danger"
              onClick={() => remove(i)}
              aria-label="Remover padrão"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder={`Adicionar padrão (ex: ${placeholderItem})`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="btn btn-primary" onClick={add}>
          Adicionar
        </button>
      </div>
      <div className="text-xs subtle">
        Padrões originais:{" "}
        {defaults.map((d) => (
          <code
            key={d}
            className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] mr-1"
          >
            {d}
          </code>
        ))}
      </div>
    </div>
  );
}
