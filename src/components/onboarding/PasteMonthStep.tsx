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
    pasteError,
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
        subtitle={`Opcional: cole a planilha de ${formatMonthLabel(monthIso)}. Sem planilha, pule.`}
      />

      <p className="text-sm leading-relaxed text-muted">
        Se você tiver a aba do mês no computador, cole aqui. Se não tiver,
        pule — dá para lançar gastos depois, no mês.
      </p>

      <Button
        variant="primary"
        className="h-10 w-full rounded-xl"
        onClick={() => void handlePasteButton()}
      >
        <ClipboardPaste size={16} />
        Colar da planilha
      </Button>
      {pasteError ? (
        <p className="text-xs text-danger" role="alert">
          {pasteError}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Button className="h-10 rounded-xl" onClick={onFinish}>
          Pular por agora
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
