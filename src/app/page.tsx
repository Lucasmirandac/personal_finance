"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dropzone } from "@/components/Dropzone";
import { parseCsvFile, CsvRowError } from "@/lib/csv";
import { useAppStore } from "@/lib/store";
import { formatBRL, formatInt } from "@/lib/format";
import { normalizeTransactions } from "@/lib/normalize";

export default function Home() {
  const { loaded, dataset, rules, setDataset, resetDataset } = useAppStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<CsvRowError[]>([]);

  async function onFile(file: File) {
    setBusy(true);
    setErrorMsg(null);
    setRowErrors([]);
    try {
      const result = await parseCsvFile(file);
      if (result.missingColumns.length > 0) {
        setErrorMsg(
          `Colunas obrigatórias ausentes: ${result.missingColumns.join(", ")}.`,
        );
        setBusy(false);
        return;
      }
      if (result.raw.length === 0) {
        setErrorMsg("Nenhuma linha válida encontrada no CSV.");
        setRowErrors(result.errors);
        setBusy(false);
        return;
      }
      if (result.errors.length > 0) {
        setRowErrors(result.errors);
      }
      await setDataset({
        fileName: file.name,
        importedAt: new Date().toISOString(),
        rowsRaw: result.raw.length,
        raw: result.raw,
      });
      router.push("/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao ler o arquivo";
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  }

  const normalizedPreview = dataset
    ? normalizeTransactions(dataset.raw, rules)
    : [];
  const gastosOnly = normalizedPreview.filter((t) => t.natureza === "Gasto");
  const totalAnalise = gastosOnly.reduce((acc, t) => acc + t.valorAnalise, 0);
  const excluidos = normalizedPreview.length - gastosOnly.length;

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Importar fatura
        </h1>
        <p className="subtle mt-1 max-w-2xl">
          Anexe seu CSV com lançamentos. O parsing e a análise acontecem
          totalmente no seu navegador — nada é enviado a servidores. Os dados e
          regras ficam salvos localmente (IndexedDB).
        </p>

        <div className="mt-6">
          <Dropzone onFile={onFile} disabled={busy} />
        </div>

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

      {loaded && dataset && (
        <section className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Dataset atual</h2>
              <p className="subtle text-sm mt-1">
                {dataset.fileName} · importado em{" "}
                {new Date(dataset.importedAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn-danger btn"
                onClick={async () => {
                  if (confirm("Limpar dados locais e voltar ao estado inicial?")) {
                    await resetDataset();
                  }
                }}
              >
                Limpar dados
              </button>
              <button
                className="btn btn-primary"
                onClick={() => router.push("/dashboard")}
              >
                Abrir dashboard →
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Stat label="Linhas no CSV" value={formatInt(dataset.rowsRaw)} />
            <Stat label="Transações de consumo" value={formatInt(gastosOnly.length)} />
            <Stat
              label="Excluídos (pag./estorno)"
              value={formatInt(excluidos)}
            />
            <Stat label="Gasto analisado" value={formatBRL(totalAnalise)} />
          </div>
        </section>
      )}

      <section className="grid sm:grid-cols-3 gap-4">
        <Help title="1. Parse local"
          body="Lê o CSV no navegador com PapaParse, validando datas brasileiras e valores em R$." />
        <Help
          title="2. Classificação"
          body="Aplica regras editáveis para separar pagamentos de fatura, estornos e gastos reais."
        />
        <Help
          title="3. Análise"
          body="KPIs, séries mensais, rankings de categorias e estabelecimentos e exportação Excel/CSV."
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
