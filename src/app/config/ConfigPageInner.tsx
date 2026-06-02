"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { ImportPanel } from "@/components/ImportPanel"
import { ClassificacaoPanel } from "@/components/ClassificacaoPanel"
import { AccountsPanel } from "@/components/AccountsPanel"
import { BackupPanel } from "@/components/BackupPanel"
import { BudgetsPanel } from "@/components/BudgetsPanel"
import { AchievementsPanel } from "@/components/AchievementsPanel"
import { AliasesPanel } from "@/components/AliasesPanel"
import { EmptyState } from "@/components/EmptyState"
import { useAppStore } from "@/lib/store"

const CONFIG_TABS = [
  { id: "importar", label: "Importar" },
  { id: "classificacao", label: "Classificação" },
  { id: "apelidos", label: "Apelidos" },
  { id: "contas", label: "Contas" },
  { id: "orcamentos", label: "Orçamentos" },
  { id: "conquistas", label: "Conquistas" },
  { id: "backup", label: "Backup" },
] as const

type ConfigTab = (typeof CONFIG_TABS)[number]["id"]

const TAB_SUBTITLES: Record<ConfigTab, string> = {
  importar: "Importe CSVs e gerencie suas fontes de dados.",
  classificacao: "Padrões de classificação de lançamentos.",
  apelidos: "Agrupe variantes de estabelecimentos.",
  contas: "Contas, saldos e horizonte de projeção.",
  orcamentos: "Limites mensais por categoria.",
  conquistas: "Marcos de rotina e meses com sobra.",
  backup: "Exporte ou restaure seus dados.",
}

function parseTab(v: string | null): ConfigTab {
  if (
    v === "classificacao" ||
    v === "apelidos" ||
    v === "contas" ||
    v === "importar" ||
    v === "orcamentos" ||
    v === "conquistas" ||
    v === "backup"
  ) {
    return v
  }
  if (v === "cartoes") return "contas"
  return "importar"
}

export default function ConfigPageInner() {
  const { loaded, hasAnalysis } = useAppStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = parseTab(searchParams.get("tab"))

  function onTabChange(id: string) {
    const next = id as ConfigTab
    router.replace(`/config?tab=${next}`, { scroll: false })
  }

  if (!loaded) return <div className="text-muted">Carregando…</div>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted mt-0.5">
          {TAB_SUBTITLES[tab]}
        </p>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <SegmentedControl<ConfigTab>
          value={tab}
          onChange={onTabChange}
          options={CONFIG_TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      <div className="pt-1">
        {tab === "importar" && <ImportPanel />}

        {tab === "classificacao" &&
          (hasAnalysis ? (
            <ClassificacaoPanel />
          ) : (
            <div className="rounded-2xl ring-1 ring-border/60 p-6">
              <EmptyState
                title="Importe dados primeiro"
                description="É necessário ter CSV importado para editar padrões de classificação."
              />
            </div>
          ))}

        {tab === "apelidos" &&
          (hasAnalysis ? (
            <AliasesPanel />
          ) : (
            <div className="rounded-2xl ring-1 ring-border/60 p-6">
              <EmptyState
                title="Importe dados primeiro"
                description="É necessário ter transações para configurar apelidos de estabelecimentos."
              />
            </div>
          ))}

        {tab === "contas" && <AccountsPanel />}

        {tab === "orcamentos" && <BudgetsPanel />}

        {tab === "conquistas" && <AchievementsPanel />}

        {tab === "backup" && <BackupPanel />}
      </div>
    </div>
  )
}
