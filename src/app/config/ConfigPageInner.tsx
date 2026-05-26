"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs } from "@/components/Tabs";
import { ImportPanel } from "@/components/ImportPanel";
import { ClassificacaoPanel } from "@/components/ClassificacaoPanel";
import { AccountsPanel } from "@/components/AccountsPanel";
import { BackupPanel } from "@/components/BackupPanel";
import { BudgetsPanel } from "@/components/BudgetsPanel";
import { AliasesPanel } from "@/components/AliasesPanel";
import { EmptyState } from "@/components/EmptyState";
import { useAppStore } from "@/lib/store";

const CONFIG_TABS = [
  { id: "importar", label: "Importar" },
  { id: "classificacao", label: "Classificação" },
  { id: "apelidos", label: "Apelidos" },
  { id: "contas", label: "Contas" },
  { id: "backup", label: "Backup" },
  { id: "orcamentos", label: "Orçamentos" },
] as const;

type ConfigTab = (typeof CONFIG_TABS)[number]["id"];

function parseTab(v: string | null): ConfigTab {
  if (
    v === "classificacao" ||
    v === "apelidos" ||
    v === "contas" ||
    v === "importar" ||
    v === "backup" ||
    v === "orcamentos"
  ) {
    return v;
  }
  if (v === "cartoes") return "contas";
  return "importar";
}

export default function ConfigPageInner() {
  const { loaded, hasAnalysis, settings, updateSettings } = useAppStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<ConfigTab>(() => parseTab(tabParam));

  useEffect(() => {
    setTab(parseTab(tabParam));
  }, [tabParam]);

  function onTabChange(id: string) {
    const next = id as ConfigTab;
    setTab(next);
    router.replace(`/config?tab=${next}`, { scroll: false });
  }

  if (!loaded) return <div className="subtle">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Configurações</h1>
        <p className="subtle text-xs mt-0.5">
          Importação, classificação de lançamentos e contas.
        </p>
      </div>

      <Tabs tabs={[...CONFIG_TABS]} active={tab} onChange={onTabChange}>
        {tab === "importar" && <ImportPanel />}

        {tab === "classificacao" &&
          (hasAnalysis ? (
            <ClassificacaoPanel />
          ) : (
            <EmptyState
              title="Importe dados primeiro"
              description="É necessário ter CSV importado para editar padrões de classificação."
            />
          ))}

        {tab === "apelidos" &&
          (hasAnalysis ? (
            <AliasesPanel />
          ) : (
            <EmptyState
              title="Importe dados primeiro"
              description="É necessário ter transações para configurar apelidos de estabelecimentos."
            />
          ))}

        {tab === "contas" && (
          <AccountsPanel
            settings={settings}
            onSaveSettings={(next) => updateSettings(next)}
          />
        )}

        {tab === "backup" && <BackupPanel />}

        {tab === "orcamentos" && <BudgetsPanel />}
      </Tabs>
    </div>
  );
}
