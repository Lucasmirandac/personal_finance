"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Dropzone } from "@/components/Dropzone";
import { parseCsvFile, CsvRowError } from "@/lib/csv";
import { useAppStore } from "@/lib/store";
import { formatBRL, formatInt } from "@/lib/format";
import { Fonte } from "@/lib/types";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";

const FONTE_LABELS: Record<Fonte, string> = {
  inter: "Inter",
  nubank: "Nubank",
  manual: "Manual",
};

export default function Home() {
  const {
    loaded,
    dataset,
    hasData,
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
    <div className="space-y-4">
      <section>
        <h1 className="text-lg font-semibold tracking-tight">Importar fatura</h1>
        <p className="subtle text-xs mt-0.5 max-w-xl">
          CSV Inter ou Nubank. Processamento 100% local.
        </p>

        <div className="mt-3">
          <Dropzone onFile={onFile} disabled={busy} />
        </div>

        {lastDetected && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="subtle">Formato:</span>
            <span className="badge badge-dot badge-gasto">
              {FONTE_LABELS[lastDetected]}
            </span>
          </div>
        )}

        {busy && (
          <div className="mt-2 text-xs subtle inline-flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Processando…
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 rounded-md border border-[var(--danger)]/40 bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-2.5 text-xs flex gap-2">
            <XCircle size={14} className="text-[var(--danger)] mt-px shrink-0" />
            <div>
              <strong className="text-[var(--danger)]">Falha:</strong> {errorMsg}
            </div>
          </div>
        )}

        {rowErrors.length > 0 && (
          <div className="mt-3 rounded-md border border-[var(--warning)]/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-2.5 text-xs flex gap-2">
            <AlertTriangle
              size={14}
              className="text-[var(--warning)] mt-px shrink-0"
            />
            <div>
              <strong className="text-[var(--warning)]">
                {rowErrors.length} linha(s) ignorada(s)
              </strong>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 max-h-32 overflow-auto">
                {rowErrors.slice(0, 15).map((e) => (
                  <li key={`${e.row}-${e.reason}`}>
                    L.{e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {loaded && hasData && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="section-title">Base consolidada</h2>
              <p className="text-xs subtle mt-0.5">
                {dataset.sources.length} fonte(s) · {formatInt(totalRows)} linhas
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-danger btn-sm"
                onClick={async () => {
                  if (
                    confirm("Limpar todas as fontes e voltar ao estado inicial?")
                  ) {
                    await clearAllSources();
                  }
                }}
              >
                <Trash2 size={13} />
                Limpar tudo
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => router.push("/dashboard")}
              >
                Dashboard
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="kpi-strip">
            <div className="kpi-cell">
              <div className="section-title">Importadas</div>
              <div className="num text-lg font-semibold mt-0.5">
                {formatInt(totalRows)}
              </div>
            </div>
            <div className="kpi-cell">
              <div className="section-title">Consumo</div>
              <div className="num text-lg font-semibold mt-0.5">
                {formatInt(gastosOnly.length)}
              </div>
            </div>
            <div className="kpi-cell">
              <div className="section-title">Excluídos</div>
              <div className="num text-lg font-semibold mt-0.5">
                {formatInt(excluidos)}
              </div>
            </div>
            <div className="kpi-cell">
              <div className="section-title">Gasto analisado</div>
              <div className="num text-lg font-semibold mt-0.5">
                {formatBRL(totalAnalise)}
              </div>
            </div>
          </div>

          <div className="table-wrap border border-[var(--border)] rounded-lg">
            <table className="dt">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Fonte</th>
                  <th className="num">Linhas</th>
                  <th>Importado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dataset.sources.map((s) => (
                  <tr key={s.id}>
                    <td className="max-w-[200px] truncate font-medium">
                      {s.fileName}
                    </td>
                    <td>
                      <span
                        className={clsx(
                          "badge badge-dot",
                          s.fonte === "inter" ? "badge-gasto" : "badge-est",
                        )}
                      >
                        {FONTE_LABELS[s.fonte]}
                      </span>
                    </td>
                    <td className="num">{formatInt(s.rowsRaw)}</td>
                    <td className="text-[11px] subtle">
                      {new Date(s.importedAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="text-right">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={async () => {
                          if (
                            confirm(`Remover "${s.fileName}" da base?`)
                          ) {
                            await removeSource(s.id);
                          }
                        }}
                        aria-label="Remover fonte"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
