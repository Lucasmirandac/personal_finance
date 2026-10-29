"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CardAccountStep } from "@/components/onboarding/CardAccountStep";
import { DebitAccountStep } from "@/components/onboarding/DebitAccountStep";
import { PasteMonthStep } from "@/components/onboarding/PasteMonthStep";
import { StepIntro } from "@/components/onboarding/wizardBits";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { hasCardAccount, hasCashAccount } from "@/lib/setupStatus";
import { requestStoragePersistence } from "@/lib/storagePersistence";
import { useAppStore } from "@/lib/store";
import type { Account } from "@/lib/types";
import { LineChart, ShieldCheck, UserX, WalletCards } from "lucide-react";

const TOTAL_STEPS = 4;

export function Onboarding() {
  const { accounts } = useAppStore();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(() =>
    initialWizardStep(accounts),
  );
  const current = currentStep + 1;
  const progress = (current / TOTAL_STEPS) * 100;

  const stepLock = useRef(false);
  function withStepLock(fn: () => void) {
    if (stepLock.current) return;
    stepLock.current = true;
    fn();
    window.setTimeout(() => {
      stepLock.current = false;
    }, 500);
  }

  const goBack = () =>
    withStepLock(() => setCurrentStep((step) => Math.max(0, step - 1)));
  const goNext = () =>
    withStepLock(() =>
      setCurrentStep((step) => Math.min(TOTAL_STEPS - 1, step + 1)),
    );
  const goToSaldo = () => router.push("/saldo");
  const goToMonth = () => router.push("/mes");

  return (
    <div className="mx-auto max-w-[46rem] space-y-6 py-4 sm:py-8">
      <WizardHeader current={current} progress={progress} />

      <Panel className="rounded-[1.75rem] p-5 shadow-[var(--shadow-card-lg)] sm:p-6">
        {currentStep === 0 && (
          <WelcomeStep
            onStart={() => {
              void requestStoragePersistence();
              goNext();
            }}
          />
        )}
        {currentStep === 1 && (
          <DebitAccountStep onBack={goBack} onContinue={goNext} />
        )}
        {currentStep === 2 && (
          <CardAccountStep onBack={goBack} onContinue={goNext} />
        )}
        {currentStep === 3 && (
          <PasteMonthStep
            onBack={goBack}
            onSeeBalance={goToSaldo}
            onPasted={goToMonth}
          />
        )}
      </Panel>
    </div>
  );
}

function initialWizardStep(accounts: Account[]) {
  if (!hasCashAccount(accounts) && !hasCardAccount(accounts)) return 0;
  if (!hasCashAccount(accounts)) return 1;
  if (!hasCardAccount(accounts)) return 2;
  return 3;
}

function WizardHeader({
  current,
  progress,
}: Readonly<{
  current: number;
  progress: number;
}>) {
  return (
    <header className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Configuração Inicial
        </h1>
        <span className="text-xs font-medium text-muted">
          Passo {current} de {TOTAL_STEPS}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-accent/15">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}

function WelcomeStep({
  onStart,
}: Readonly<{
  onStart: () => void;
}>) {
  return (
    <div className="space-y-6">
      <StepIntro
        icon={<WalletCards size={24} />}
        iconClassName="bg-accent/12 text-accent"
        title="Bem-vindo ao Saldo Real"
        subtitle="Cadastre uma conta e um cartão. Sem login, sem enviar extrato."
      />

      <div className="space-y-4">
        <Benefit
          icon={<ShieldCheck size={17} />}
          title="Fica no navegador"
          description="Saldos e gastos ficam neste aparelho. Nada vai para um servidor do Saldo Real."
        />
        <Benefit
          icon={<UserX size={17} />}
          title="Sem cadastro"
          description="Conta de débito e cartão. Trazer a fatura do banco é opcional, depois."
        />
        <Benefit
          icon={<LineChart size={17} />}
          title="Saldo de hoje"
          description="O que você lança aparece em Hoje, extrato e faturas."
        />
      </div>

      <Button variant="primary" className="h-10 w-full rounded-xl" onClick={onStart}>
        Começar
      </Button>
    </div>
  );
}

function Benefit({
  icon,
  title,
  description,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
}>) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-accent">{icon}</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}
