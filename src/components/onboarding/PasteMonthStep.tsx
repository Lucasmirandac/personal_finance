"use client";

import { ArrowLeft, ClipboardPaste } from "lucide-react";
import { MonthPastePreview } from "@/components/mes/MonthPastePreview";
import { useMonthGridPaste } from "@/components/mes/useMonthGridPaste";
import { Button } from "@/components/ui/Button";
import { todayIso } from "@/lib/dates";
import { formatMonthLabel } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { StepIntro } from "./wizardBits";

type Props = {
  onBack: () => void;
  onFinish: () => void;
};

export function PasteMonthStep({ onBack, onFinish }: Props) {
  const monthIso = todayIso().slice(0, 7);
  const { accounts } = useAppStore();
  const {
    pasteRows,
    pasteOpen,
    handlePasteEvent,
    handlePasteButton,
    closePaste,
    confirmPaste,
  } = useMonthGridPaste(monthIso);

  return (
    <div className="space-y-5" onPaste={handlePasteEvent}>
      <StepIntro
        icon={<ClipboardPaste size={24} />}
        iconClassName="bg-accent/12 text-accent"
        title="Trazer o mês"
        subtitle={`Cole a aba de ${formatMonthLabel(monthIso)} — ou pule e lance na grade`}
      />

      <p className="text-sm leading-relaxed text-muted">
        Copie as três tabelas da planilha (fixos, parcelas e gastos). Totais e
        orçado × realizado ficam de fora. CSV do banco continua em Config, se
        quiser atualizar a fatura depois.
      </p>

      <Button
        variant="primary"
        className="h-10 w-full rounded-xl"
        onClick={() => void handlePasteButton()}
      >
        <ClipboardPaste size={16} />
        Colar da planilha
      </Button>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Button className="h-10 rounded-xl" onClick={onFinish}>
          Pular e lançar na grade
        </Button>
        <Button className="h-10 rounded-xl px-5" onClick={onBack}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
      </div>

      <MonthPastePreview
        open={pasteOpen && pasteRows != null}
        initialRows={pasteRows ?? []}
        accounts={accounts}
        onClose={closePaste}
        onConfirm={(rows) => {
          void confirmPaste(rows).then((ok) => {
            if (ok) onFinish();
          });
        }}
      />
    </div>
  );
}
