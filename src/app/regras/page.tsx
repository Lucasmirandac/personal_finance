"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { DEFAULT_RULES, Rules } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { NatureBadge } from "@/components/NatureBadge";
import { formatBRL, formatInt } from "@/lib/format";
import { normalizeTransactions } from "@/lib/normalize";

export default function RegrasPage() {
  const { loaded, dataset, hasAnalysis, rules, updateRules, resetRules } =
    useAppStore();
  const [draft, setDraft] = useState<Rules>(rules);
  const [dirty, setDirty] = useState(false);
  const [storedRules, setStoredRules] = useState<Rules>(rules);
  if (storedRules !== rules) {
    setStoredRules(rules);
    setDraft(rules);
    setDirty(false);
  }

  const allRaw = useMemo(
    () => dataset.sources.flatMap((s) => s.raw),
    [dataset.sources],
  );

  const preview = useMemo(() => {
    if (allRaw.length === 0) return null;
    const norm = normalizeTransactions(allRaw, draft);
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
  }, [allRaw, draft]);

  if (!loaded) return <div className="subtle">Carregando…</div>;
  if (!hasAnalysis)
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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Regras</h1>
          <p className="subtle text-xs mt-0.5">
            Padrões de classificação. Salvar recalcula todo o dataset.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn btn-danger btn-sm"
            onClick={async () => {
              if (confirm("Restaurar padrões originais?")) {
                await resetRules();
              }
            }}
          >
            Restaurar padrões
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              setDraft(rules);
              setDirty(false);
            }}
            disabled={!dirty}
          >
            Descartar
          </button>
          <button
            className="btn btn-primary btn-sm"
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
        <div className="panel p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="section-title">Pré-visualização</span>
            <span className="text-[11px] subtle">Salve para aplicar</span>
          </div>
          <div className="kpi-strip">
            <div className="kpi-cell">
              <div className="section-title">Gasto</div>
              <div className="num text-base font-semibold mt-0.5">
                {formatBRL(preview.total)}
              </div>
            </div>
            <div className="kpi-cell">
              <div className="section-title">Consumo</div>
              <div className="num text-base font-semibold mt-0.5">
                {formatInt(preview.countGasto)}
              </div>
            </div>
            <div className="kpi-cell">
              <div className="section-title">Pagamentos</div>
              <div className="num text-base font-semibold mt-0.5">
                {formatInt(preview.countPag)}
              </div>
            </div>
            <div className="kpi-cell">
              <div className="section-title">Estornos</div>
              <div className="num text-base font-semibold mt-0.5">
                {formatInt(preview.countEst)}
              </div>
            </div>
          </div>
          {preview.excludedSamples.length > 0 && (
            <div className="table-wrap border border-[var(--border)] rounded-lg">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Lançamento</th>
                    <th>Natureza</th>
                    <th className="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.excludedSamples.map((t) => (
                    <tr key={t.id}>
                      <td>{t.data}</td>
                      <td className="max-w-[280px] truncate">{t.lancamento}</td>
                      <td>
                        <NatureBadge natureza={t.natureza} />
                      </td>
                      <td className="num">{formatBRL(t.valorOriginal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
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
    <div className="panel flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <div className="section-title">{title}</div>
        <p className="text-[11px] subtle mt-0.5">{description}</p>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {values.map((v, i) => (
          <li key={i} className="flex items-center gap-2 px-3 py-2">
            <input
              className="input"
              value={v}
              onChange={(e) => setIdx(i, e.target.value)}
            />
            <button
              className="btn btn-danger btn-sm shrink-0"
              onClick={() => remove(i)}
              aria-label="Remover padrão"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 p-3 border-t border-[var(--border)]">
        <input
          className="input"
          placeholder={placeholderItem}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="btn btn-primary btn-sm shrink-0" onClick={add}>
          +
        </button>
      </div>
      <div className="text-[11px] subtle px-3 pb-3">
        Padrões originais:{" "}
        {defaults.map((d) => (
          <code key={d} className="chip mr-1">
            {d}
          </code>
        ))}
      </div>
    </div>
  );
}
