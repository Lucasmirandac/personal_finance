"use client";

import { ArrowLeft, ClipboardPaste, FileSpreadsheet, Receipt, WalletCards } from "lucide-react";
import Link from "next/link";
import { MonthPastePreview } from "@/components/mes/MonthPastePreview";
import { useMonthGridPaste } from "@/components/mes/useMonthGridPaste";
import { Button } from "@/components/ui/Button";
import { todayIso } from "@/lib/dates";
import { useAppStore } from "@/lib/store";
import { StepIntro } from "./wizardBits";

type Props = {
  onBack: () => void;
  onSeeBalance: () => void;
  onPasted: () => void;
};

export function PasteMonthStep({ onBack, onSeeBalance, onPasted }: Props) {
  const monthIso = todayIso().slice(0, 7);
  const { accounts } = useAppStore();
  const {
    pasteRows,
    pasteOpen,
    pasteError,
    handlePasteEvent,
    handlePasteButton,
    closePaste,
    confirmPaste,
  } = useMonthGridPaste(monthIso);

  return (
    <div className="space-y-5" onPaste={handlePasteEvent}>
      <StepIntro
        icon={<WalletCards size={24} />}
        iconClassName="bg-accent/12 text-accent"
        title="Seu saldo já está aqui"
        subtitle="Com a conta cadastrada, você já pode ver o saldo de hoje. Trazer fatura ou planilha é opcional."
      />

      <Button
        variant="primary"
        className="h-10 w-full rounded-xl"
        onClick={onSeeBalance}
      >
        Ver saldo de hoje
      </Button>

      <div className="space-y-2">
        <details className="rounded-2xl border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <Receipt size={16} className="text-accent" />
            Tenho a fatura do cartão
          </summary>
          <div className="space-y-3 border-t border-border px-4 py-3">
            <p className="text-sm leading-relaxed text-muted">
              No app do Nubank ou do Inter, baixe a fatura. O arquivo vem como
              .csv e é lido neste aparelho.
            </p>
            <Link
              href="/config?tab=importar"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2"
            >
              Importar fatura
            </Link>
          </div>
        </details>

        <details className="rounded-2xl border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <FileSpreadsheet size={16} className="text-accent" />
            Já anoto o mês numa planilha
          </summary>
          <div className="space-y-3 border-t border-border px-4 py-3">
            <p className="text-sm leading-relaxed text-muted">
              Se você já usa uma planilha no Google Sheets ou Excel, copie as
              linhas e cole aqui. Exemplo das colunas:
            </p>
            <div className="overflow-x-auto rounded-xl bg-surface-2 px-3 py-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="py-1 pr-3 font-medium">Nome</th>
                    <th className="py-1 pr-3 font-medium">Data</th>
                    <th className="py-1 pr-3 font-medium">Categoria</th>
                    <th className="py-1 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1 pr-3">Aluguel</td>
                    <td className="py-1 pr-3">09/11</td>
                    <td className="py-1 pr-3">Casa</td>
                    <td className="py-1">792,00</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-3">Mercado</td>
                    <td className="py-1 pr-3">13/11</td>
                    <td className="py-1 pr-3">Alimentação</td>
                    <td className="py-1">75,23</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Button
              className="h-10 w-full rounded-xl"
              onClick={() => void handlePasteButton()}
            >
              <ClipboardPaste size={16} />
              Colar do Sheets ou Excel
            </Button>
            {pasteError ? (
              <p className="text-xs text-danger" role="alert">
                {pasteError}
              </p>
            ) : null}
          </div>
        </details>
      </div>

      <Button className="h-10 rounded-xl px-5" onClick={onBack}>
        <ArrowLeft size={14} />
        Voltar
      </Button>

      <MonthPastePreview
        open={pasteOpen && pasteRows != null}
        initialRows={pasteRows ?? []}
        accounts={accounts}
        onClose={closePaste}
        onConfirm={(rows) => {
          void confirmPaste(rows).then((ok) => {
            if (ok) onPasted();
          });
        }}
      />
    </div>
  );
}
