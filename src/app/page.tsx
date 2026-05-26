"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Dropzone } from "@/components/Dropzone";
import { parseCsvFile, CsvRowError } from "@/lib/csv";
import { useAppStore } from "@/lib/store";
import { formatBRL, formatInt } from "@/lib/format";
import { Fonte } from "@/lib/types";

const FONTE_LABELS: Record<Fonte, string> = {
  inter: "Inter",
  nubank: "Nubank",
};

export default function Home() {
  const {
    loaded,
    dataset,
    hasData,
    rules,
    normalized,
    addSource,
    removeSource,
    clearAllSources,
  } = useAppStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<CsvRowError[]>([]);
  const [lastDetected, setLastDetected] = useState<Fonte | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setErrorMsg(null);
    setRowErrors([]);
    setLastDetected(null);
    try {
      const result = await parseCsvFile(file);
      if (result.missingColumns.length > 0) {
        setErrorMsg(result.missingColumns.join(" "));
        setBusy(false);
        return;
      }
      if (!result.source || result.source.raw.length === 0) {
        setErrorMsg("Nenhuma linha válida encontrada no CSV.");
        setRowErrors(result.errors);
        setBusy(false);
        return;
      }
      if (result.errors.length > 0) {
        setRowErrors(result.errors);
      }
      setLastDetected(result.detectedFormat);
      await addSource(result.source);
      router.push("/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao ler o arquivo";
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  }

  const gastosOnly = normalized.filter((t) => t.natureza === "Gasto");
  const totalAnalise = gastosOnly.reduce((acc, t) => acc + t.valorAnalise, 0);
  const excluidos = normalized.length - gastosOnly.length;
  const totalRows = dataset.sources.reduce((acc, s) => acc + s.rowsRaw, 0);

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Importar fatura
        </h1>
        <p className="subtle mt-1 max-w-2xl">
          Anexe CSVs do Inter ou Nubank. Cada arquivo é adicionado à base atual.
          Tudo processado no navegador — nada é enviado a servidores.
        </p>

        <div className="mt-6">
          <Dropzone onFile={onFile} disabled={busy} />
        </div>

        {lastDetected && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm subtle">Formato detectado:</span>
            <span
              className={clsx(
                "badge",
                lastDetected === "inter" ? "badge-gasto" : "badge-est",
              )}
            >
              {FONTE_LABELS[lastDetected]}
            </span>
          </div>
        )}

        {busy && (
          <div className="mt-4 text-sm subtle">Processando o arquivo…</div>
        )}

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-[var(--danger)]/40 bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-3 text-sm">
            <strong className="text-[var(--danger)]">Falha:</strong> {errorMsg}
          </div>
        )}

        {rowErrors.length > 0 && (
          <div className="mt-4 rounded-lg border border-[var(--warning)]/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-3 text-sm">
            <strong className="text-[var(--warning)]">
              {rowErrors.length} linha(s) ignorada(s)
            </strong>{" "}
            durante a importação:
            <ul className="mt-2 list-disc pl-5 space-y-1 max-h-40 overflow-auto">
              {rowErrors.slice(0, 20).map((e) => (
                <li key={`${e.row}-${e.reason}`}>
                  Linha {e.row}: {e.reason}
                </li>
              ))}
              {rowErrors.length > 20 && (
                <li>… e mais {rowErrors.length - 20} erro(s).</li>
              )}
            </ul>
          </div>
        )}
      </section>

      {loaded && hasData && (
        <section className="card p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Base consolidada</h2>
              <p className="subtle text-sm mt-1">
                {dataset.sources.length} fonte(s) · {formatInt(totalRows)} linhas
                importadas
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                className="btn-danger btn"
                onClick={async () => {
                  if (
                    confirm(
                      "Limpar todas as fontes e voltar ao estado inicial?",
                    )
                  ) {
                    await clearAllSources();
                  }
                }}
              >
                Limpar tudo
              </button>
              <button
                className="btn btn-primary"
                onClick={() => router.push("/dashboard")}
              >
                Abrir dashboard →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Linhas importadas" value={formatInt(totalRows)} />
            <Stat
              label="Transações de consumo"
              value={formatInt(gastosOnly.length)}
            />
            <Stat
              label="Excluídos (pag./estorno)"
              value={formatInt(excluidos)}
            />
            <Stat label="Gasto analisado" value={formatBRL(totalAnalise)} />
          </div>

          <div>
            <h3 className="font-medium text-sm mb-3">Fontes carregadas</h3>
            <ul className="space-y-2">
              {dataset.sources.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.fileName}</div>
                    <div className="text-xs subtle mt-0.5 flex flex-wrap items-center gap-2">
                      <span
                        className={clsx(
                          "badge",
                          s.fonte === "inter" ? "badge-gasto" : "badge-est",
                        )}
                      >
                        {FONTE_LABELS[s.fonte]}
                      </span>
                      <span>{formatInt(s.rowsRaw)} linhas</span>
                      <span>
                        {new Date(s.importedAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-danger shrink-0"
                    onClick={async () => {
                      if (
                        confirm(`Remover "${s.fileName}" da base consolidada?`)
                      ) {
                        await removeSource(s.id);
                      }
                    }}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="grid sm:grid-cols-3 gap-4">
        <Help
          title="1. Parse local"
          body="Detecta automaticamente Inter (Data, Lançamento, Categoria, Tipo, Valor) ou Nubank (date, title, amount)."
        />
        <Help
          title="2. Classificação"
          body="Aplica regras editáveis para separar pagamentos de fatura, estornos e gastos reais."
        />
        <Help
          title="3. Análise"
          body="Some várias faturas em uma base única. KPIs, gráficos e exportação Excel/CSV."
        />
      </section>
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

function Help({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-4">
      <div className="font-medium">{title}</div>
      <p className="subtle text-sm mt-1">{body}</p>
    </div>
  );
}
