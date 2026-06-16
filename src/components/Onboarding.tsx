"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImportPanel } from "@/components/ImportPanel";
import { AccountsPanel } from "@/components/AccountsPanel";
import { QuickAddModal } from "@/components/QuickAddModal";
import { DivisorDeAguasStep } from "@/components/onboarding/DivisorDeAguasStep";
import { useAppStore } from "@/lib/store";
import {
  getSetupSteps,
  hasCashAccount,
  hasIncome,
  SetupStep,
} from "@/lib/setupStatus";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  LineChart,
  ShieldCheck,
  Upload,
  UserX,
  WalletCards,
} from "lucide-react";
import clsx from "clsx";
import { requestStoragePersistence } from "@/lib/storagePersistence";

const TOTAL_STEPS = 3;

export function Onboarding() {
  const { dataset, settings, recurringRules, accounts } = useAppStore();
  const router = useRouter();
  const [showAccounts, setShowAccounts] = useState(
    () => !hasCashAccount(accounts),
  );
  const [showDivisor, setShowDivisor] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const steps = getSetupSteps(dataset, settings, recurringRules, accounts);
  const [currentStep, setCurrentStep] = useState(() => initialWizardStep(steps));
  const current = currentStep + 1;
  const progress = (current / TOTAL_STEPS) * 100;

  const canContinueAccounts = hasCashAccount(accounts);
  const canFinishSetup = hasIncome(recurringRules);

  const goBack = () => setCurrentStep((step) => Math.max(0, step - 1));
  const goNext = () => setCurrentStep((step) => Math.min(TOTAL_STEPS - 1, step + 1));
  const goToPanel = () => router.push("/saldo");

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
          <AccountsStep
            accountsDone={steps.some((step) => step.id === "contas" && step.done)}
            accountsCount={accounts.length}
            canContinue={canContinueAccounts}
            showAccounts={showAccounts}
            onBack={goBack}
            onContinue={goNext}
            onToggleAccounts={() => setShowAccounts((open) => !open)}
            onQuickAdd={() => setShowQuickAdd(true)}
          />
        )}

        {currentStep === 2 && (
          <ImportStep
            canFinish={canFinishSetup}
            csvDone={steps.some((step) => step.id === "csv" && step.done)}
            incomeDone={canFinishSetup}
            showDivisor={showDivisor}
            onBack={goBack}
            onFinish={goToPanel}
            onToggleDivisor={() => setShowDivisor((open) => !open)}
          />
        )}
      </Panel>

      <QuickAddModal open={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
    </div>
  );
}

function initialWizardStep(steps: SetupStep[]) {
  const csv = steps.find((step) => step.id === "csv");
  const contas = steps.find((step) => step.id === "contas");
  const recorrentes = steps.find((step) => step.id === "recorrentes");

  if (!csv?.done && !contas?.done && !recorrentes?.done) return 0;
  if (!contas?.done) return 1;
  if (!csv?.done || !recorrentes?.done) return 2;
  return 0;
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
        icon={<Upload size={24} />}
        iconClassName="bg-accent/12 text-accent"
        title="Bem-vindo ao Saldo Real"
        subtitle="Seu painel financeiro pessoal, 100% local e privado"
      />

      <div className="space-y-4">
        <Benefit
          icon={<ShieldCheck size={17} />}
          title="Local-first"
          description="Seus dados ficam no navegador; pedimos proteção contra limpezas automáticas do sistema"
        />
        <Benefit
          icon={<UserX size={17} />}
          title="Sem cadastro"
          description="Cadastre contas e comece — importação de CSV é opcional"
        />
        <Benefit
          icon={<LineChart size={17} />}
          title="Projeção de saldo"
          description="Saiba quanto você terá nos próximos meses"
        />
      </div>

      <Button variant="primary" className="h-10 w-full rounded-xl" onClick={onStart}>
        Começar
      </Button>
    </div>
  );
}

function AccountsStep({
  accountsDone,
  accountsCount,
  canContinue,
  showAccounts,
  onBack,
  onContinue,
  onToggleAccounts,
  onQuickAdd,
}: Readonly<{
  accountsDone: boolean;
  accountsCount: number;
  canContinue: boolean;
  showAccounts: boolean;
  onBack: () => void;
  onContinue: () => void;
  onToggleAccounts: () => void;
  onQuickAdd: () => void;
}>) {
  return (
    <div className="space-y-5">
      <StepIntro
        icon={<WalletCards size={24} />}
        iconClassName="bg-info/12 text-info"
        title="Configure suas contas"
        subtitle="Cadastre suas contas bancárias e cartões"
      />

      <p className="text-sm leading-relaxed text-muted">
        Você pode cadastrar contas correntes, poupanças, carteiras e cartões de
        crédito. Cada conta terá um saldo inicial que será usado para calcular
        projeções futuras.
      </p>

      {!canContinue && (
        <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Info size={15} className="text-warning" />
            Obrigatório
          </p>
          <p className="mt-2 text-sm text-muted">
            Cadastre ao menos uma conta de saldo (corrente, poupança ou
            carteira) para continuar. Cartão sozinho não libera o próximo passo.
          </p>
        </div>
      )}

      {accountsDone && (
        <div className="rounded-2xl bg-success/10 p-3 text-sm text-success">
          {accountsCount} conta{accountsCount === 1 ? "" : "s"} configurada
          {accountsCount === 1 ? "" : "s"}.
        </div>
      )}

      {showAccounts && (
        <div className="rounded-2xl border border-border bg-surface p-3">
          <AccountsPanel onClose={onToggleAccounts} />
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Button
          variant="primary"
          className="h-10 rounded-xl"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Continuar
        </Button>
        <Button className="h-10 rounded-xl px-5" onClick={onToggleAccounts}>
          {showAccounts ? "Ocultar contas" : "Configurar agora"}
        </Button>
        <Button className="h-10 rounded-xl px-5" onClick={onBack}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
      </div>

      {accountsDone && (
        <button
          type="button"
          className="text-xs text-muted underline underline-offset-4 hover:text-foreground"
          onClick={onQuickAdd}
        >
          Adicionar primeiro gasto manual
        </button>
      )}
    </div>
  );
}

function ImportStep({
  canFinish,
  csvDone,
  incomeDone,
  showDivisor,
  onBack,
  onFinish,
  onToggleDivisor,
}: Readonly<{
  canFinish: boolean;
  csvDone: boolean;
  incomeDone: boolean;
  showDivisor: boolean;
  onBack: () => void;
  onFinish: () => void;
  onToggleDivisor: () => void;
}>) {
  const divisorButtonLabel = showDivisor
    ? "Ocultar"
    : divisorLabel(incomeDone);

  return (
    <div className="space-y-5">
      <StepIntro
        icon={<LineChart size={24} />}
        iconClassName="bg-[color-mix(in_oklab,var(--cat-4)_14%,transparent)] text-cat-4"
        title="Opcional: importe CSV"
        subtitle="Nubank e Inter — ou lance gastos manualmente"
      />

      <p className="text-sm leading-relaxed text-muted">
        Você também pode lançar gastos manualmente no Quick Add, sem importar
        nada. Se tiver CSV do Nubank ou Inter, arraste abaixo para classificar
        transações automaticamente.
      </p>

      <div className="rounded-2xl border border-dashed border-border-strong bg-surface/70 p-4">
        <ImportPanel redirectAfterImport="/comecar" compact />
      </div>

      {csvDone && (
        <div className="rounded-2xl bg-success/10 p-3 text-sm text-success">
          Dados importados com sucesso.
        </div>
      )}

      {incomeDone && (
        <div className="rounded-2xl bg-success/10 p-3 text-sm text-success">
          Renda cadastrada. Você já pode ir para o painel.
        </div>
      )}

      {!canFinish && (
        <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Info size={15} className="text-warning" />
            Obrigatório
          </p>
          <p className="mt-2 text-sm text-muted">
            Cadastre ao menos uma renda no Divisor de Águas para concluir. A
            importação de CSV é opcional.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface-2/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Divisor de Águas</p>
            <p className="mt-1 text-sm text-muted">
              Cadastre suas rendas e custos fixos para liberar o limite diário
              no painel. Você pode adicionar quantos quiser antes de avançar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/divisor"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
            >
              Abrir página completa
              <ArrowRight size={13} />
            </Link>
            <Button size="sm" className="rounded-full" onClick={onToggleDivisor}>
              {divisorButtonLabel}
              <ArrowRight size={13} />
            </Button>
          </div>
        </div>
        {showDivisor && <DivisorDeAguasStep />}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Button
          variant="primary"
          className="h-10 rounded-xl"
          disabled={!canFinish}
          onClick={onFinish}
        >
          Ir para o Painel quando terminar
        </Button>
        <Button className="h-10 rounded-xl px-5" onClick={onBack}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
      </div>
    </div>
  );
}

function divisorLabel(incomeDone: boolean) {
  return incomeDone ? "Revisar" : "Configurar";
}

function StepIntro({
  icon,
  iconClassName,
  title,
  subtitle,
}: Readonly<{
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  subtitle: string;
}>) {
  return (
    <div>
      <span
        className={clsx(
          "flex h-12 w-12 items-center justify-center rounded-2xl",
          iconClassName,
        )}
      >
        {icon}
      </span>
      <h2 className="mt-5 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
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
