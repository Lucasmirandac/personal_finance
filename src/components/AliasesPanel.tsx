"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  buildAliasSuggestions,
  formatSuggestionCanonical,
} from "@/lib/aliasSuggestions";
import { establishmentAggregation } from "@/lib/aggregations";
import { extractEstabelecimento } from "@/lib/normalize";
import { newAliasId } from "@/lib/ids";
import { useAppStore } from "@/lib/store";
import { EstablishmentAlias, TransactionNormalized } from "@/lib/types";
import { formatBRL, formatInt } from "@/lib/format";
import { Link2, Pencil, Plus, Trash2, X } from "lucide-react";

type AliasFormState = {
  canonical: string;
  patterns: string[];
};

const emptyForm = (): AliasFormState => ({
  canonical: "",
  patterns: [],
});

function countUniqueBeforeAlias(normalized: TransactionNormalized[]): number {
  const set = new Set<string>();
  for (const t of normalized) {
    if (t.natureza !== "Gasto") continue;
    set.add(extractEstabelecimento(t.lancamento));
  }
  return set.size;
}

export function AliasesPanel() {
  const {
    hasAnalysis,
    normalized,
    establishmentAliases,
    addAlias,
    updateAlias,
    removeAlias,
  } = useAppStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AliasFormState>(emptyForm);
  const [patternInput, setPatternInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [suggestionCanonicals, setSuggestionCanonicals] = useState<
    Record<string, string>
  >({});
  const [busyToken, setBusyToken] = useState<string | null>(null);

  const suggestions = useMemo(
    () =>
      hasAnalysis
        ? buildAliasSuggestions(normalized, establishmentAliases)
        : [],
    [hasAnalysis, normalized, establishmentAliases],
  );

  const preview = useMemo(() => {
    if (!hasAnalysis) return null;
    const before = countUniqueBeforeAlias(normalized);
    const after = establishmentAggregation(normalized).length;
    const consolidated = Math.max(0, before - after);
    return { before, after, consolidated };
  }, [hasAnalysis, normalized]);

  function openNew(prefill?: Partial<AliasFormState>) {
    setEditingId(null);
    setForm({
      canonical: prefill?.canonical ?? "",
      patterns: prefill?.patterns ?? [],
    });
    setPatternInput("");
    setError(null);
    setFormOpen(true);
  }

  function openEdit(alias: EstablishmentAlias) {
    setEditingId(alias.id);
    setForm({
      canonical: alias.canonical,
      patterns: [...alias.patterns],
    });
    setPatternInput("");
    setError(null);
    setFormOpen(true);
  }

  function addPattern() {
    const v = patternInput.trim();
    if (!v) return;
    if (form.patterns.some((p) => p.toUpperCase() === v.toUpperCase())) {
      setPatternInput("");
      return;
    }
    setForm({ ...form, patterns: [...form.patterns, v] });
    setPatternInput("");
  }

  function removePattern(idx: number) {
    const next = [...form.patterns];
    next.splice(idx, 1);
    setForm({ ...form, patterns: next });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const canonical = form.canonical.trim();
    const patterns = form.patterns.map((p) => p.trim()).filter(Boolean);
    if (!canonical) {
      setError("Informe o nome canônico (apelido).");
      return;
    }
    if (patterns.length === 0) {
      setError("Adicione ao menos um padrão.");
      return;
    }

    const now = new Date().toISOString();
    try {
      if (editingId) {
        const existing = establishmentAliases.find((a) => a.id === editingId);
        if (!existing) return;
        await updateAlias({
          ...existing,
          canonical,
          patterns,
        });
      } else {
        await addAlias({
          id: newAliasId(),
          canonical,
          patterns,
          criadoEm: now,
          atualizadaEm: now,
        });
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Excluir este apelido?")) return;
    try {
      await removeAlias(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleGroupSuggestion(token: string) {
    const suggestion = suggestions.find((s) => s.token === token);
    if (!suggestion) return;
    const canonical =
      suggestionCanonicals[token]?.trim() ||
      formatSuggestionCanonical(suggestion.token);
    if (!canonical) return;

    setBusyToken(token);
    setError(null);
    const now = new Date().toISOString();
    try {
      await addAlias({
        id: newAliasId(),
        canonical,
        patterns: suggestion.variantes.map((v) => v.estabelecimento),
        criadoEm: now,
        atualizadaEm: now,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao agrupar.");
    } finally {
      setBusyToken(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="section-title">Apelidos de estabelecimentos</div>
          <p className="text-[11px] subtle mt-0.5 max-w-xl">
            Agrupe variantes do mesmo lugar (ex.: PAG*MERC IFOOD, IFD*REST →
            iFood). Padrões casam por substring, sem diferenciar maiúsculas.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => openNew()}
        >
          <Plus size={13} />
          Novo apelido
        </button>
      </div>

      {preview && preview.consolidated > 0 && (
        <div className="panel p-3 kpi-strip">
          <div className="kpi-cell">
            <div className="section-title">Antes</div>
            <div className="num text-base font-semibold mt-0.5">
              {formatInt(preview.before)}
            </div>
            <div className="text-[11px] subtle">nomes únicos</div>
          </div>
          <div className="kpi-cell">
            <div className="section-title">Depois</div>
            <div className="num text-base font-semibold mt-0.5">
              {formatInt(preview.after)}
            </div>
            <div className="text-[11px] subtle">no ranking</div>
          </div>
          <div className="kpi-cell">
            <div className="section-title">Consolidados</div>
            <div className="num text-base font-semibold mt-0.5 text-[var(--success)]">
              {formatInt(preview.consolidated)}
            </div>
            <div className="text-[11px] subtle">variantes agrupadas</div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-[var(--danger)] panel p-2">{error}</p>
      )}

      {formOpen && (
        <form
          className="panel p-4 space-y-3 border border-[var(--border)]"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <div className="section-title">
            {editingId ? "Editar apelido" : "Novo apelido"}
          </div>
          <label className="block space-y-1">
            <span className="text-xs subtle">Nome canônico</span>
            <input
              className="input w-full"
              placeholder="iFood"
              value={form.canonical}
              onChange={(e) =>
                setForm({ ...form, canonical: e.target.value })
              }
              autoFocus
            />
          </label>
          <div className="space-y-2">
            <span className="text-xs subtle">Padrões (variantes)</span>
            <ul className="space-y-1">
              {form.patterns.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={p}
                    onChange={(e) => {
                      const next = [...form.patterns];
                      next[i] = e.target.value;
                      setForm({ ...form, patterns: next });
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-danger btn-sm shrink-0"
                    onClick={() => removePattern(i)}
                    aria-label="Remover padrão"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="IFOOD"
                value={patternInput}
                onChange={(e) => setPatternInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPattern();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-sm shrink-0"
                onClick={addPattern}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="submit" className="btn btn-primary btn-sm">
              Salvar
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {establishmentAliases.length === 0 ? (
        <p className="text-sm subtle panel p-4">
          Nenhum apelido cadastrado. Use uma sugestão abaixo ou crie manualmente.
        </p>
      ) : (
        <ul className="panel divide-y divide-[var(--border)] overflow-hidden">
          {establishmentAliases.map((alias) => (
            <li
              key={alias.id}
              className="px-3 py-3 flex items-start justify-between gap-3 flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">{alias.canonical}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {alias.patterns.map((p) => (
                    <code key={p} className="chip text-[10px]">
                      {p}
                    </code>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => openEdit(alias)}
                  aria-label={`Editar ${alias.canonical}`}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => void handleRemove(alias.id)}
                  aria-label={`Excluir ${alias.canonical}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasAnalysis && suggestions.length > 0 && (
        <section className="space-y-3">
          <div>
            <div className="section-title flex items-center gap-2">
              <Link2 size={14} />
              Sugestões de agrupamento
            </div>
            <p className="text-[11px] subtle mt-0.5">
              Variantes parecidas detectadas nos seus gastos. Agrupe com um clique.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {suggestions.map((s) => {
              const canonicalDefault =
                suggestionCanonicals[s.token] ??
                formatSuggestionCanonical(s.token);
              return (
                <div key={s.token} className="panel p-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {s.variantes.map((v) => (
                      <code key={v.estabelecimento} className="chip text-[10px]">
                        {v.estabelecimento}
                      </code>
                    ))}
                  </div>
                  <div className="text-[11px] subtle">
                    {formatInt(s.variantes.length)} variantes ·{" "}
                    {formatBRL(s.totalGasto)} no total
                  </div>
                  <div className="flex gap-2 items-end flex-wrap">
                    <label className="flex-1 min-w-[120px] space-y-1">
                      <span className="text-[11px] subtle">Apelido</span>
                      <input
                        className="input w-full"
                        value={canonicalDefault}
                        onChange={(e) =>
                          setSuggestionCanonicals((prev) => ({
                            ...prev,
                            [s.token]: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className={clsx(
                        "btn btn-primary btn-sm shrink-0",
                        busyToken === s.token && "opacity-70",
                      )}
                      disabled={busyToken === s.token}
                      onClick={() => void handleGroupSuggestion(s.token)}
                    >
                      {busyToken === s.token ? "Agrupando…" : "Agrupar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {hasAnalysis && suggestions.length === 0 && establishmentAliases.length > 0 && (
        <p className="text-sm subtle">
          Nenhuma sugestão pendente — variantes restantes já estão cobertas.
        </p>
      )}
    </div>
  );
}
