"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs } from "@/components/Tabs";
import { ImportPanel } from "@/components/ImportPanel";
import { ClassificacaoPanel } from "@/components/ClassificacaoPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { EmptyState } from "@/components/EmptyState";
import { useAppStore } from "@/lib/store";
import { Fonte } from "@/lib/types";

const CONFIG_TABS = [
  { id: "importar", label: "Importar" },
  { id: "classificacao", label: "Classificação" },
  { id: "cartoes", label: "Cartões & Saldo" },
] as const;

type ConfigTab = (typeof CONFIG_TABS)[number]["id"];

function parseTab(v: string | null): ConfigTab {
  if (v === "classificacao" || v === "cartoes" || v === "importar") return v;
  return "importar";
}

export default function ConfigPageInner() {
  const { loaded, hasAnalysis, dataset, settings, updateSettings } =
    useAppStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<ConfigTab>(() => parseTab(tabParam));

  useEffect(() => {
    setTab(parseTab(tabParam));
  }, [tabParam]);

  const cardSources = [...new Set(dataset.sources.map((s) => s.fonte))] as Fonte[];

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
          Importação, classificação de lançamentos e projeção de saldo.
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

        {tab === "cartoes" && (
          <SettingsPanel
            settings={settings}
            cardSources={cardSources}
            onSave={(next) => updateSettings(next)}
          />
        )}
      </Tabs>
    </div>
  );
}
