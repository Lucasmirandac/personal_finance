"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { trackEvent, updateGtagConsentDenied } from "@/lib/analytics";
import {
  markConsentGrantPending,
  setConsent,
  useConsent,
  type ConsentStatus,
} from "@/lib/consent";

const COLLECTED = [
  "Telas visitadas (sem filtros sensíveis na URL)",
  "Passos do onboarding concluídos",
  "Importação de CSV iniciada ou concluída (sem conteúdo do arquivo)",
  "Backup exportado ou importado (versão e resultado, sem dados)",
  "Orçamento criado ou sugestão aceita (apenas contagem)",
  "Fechamento de mês e conquistas desbloqueadas (IDs internos)",
] as const;

const NOT_COLLECTED = [
  "Valores monetários, saldos ou limites de orçamento",
  "Descrições de lançamentos ou nomes de estabelecimentos",
  "Conteúdo de CSV ou backups",
  "Categorias com valores associados",
  "E-mail ou identificação pessoal",
] as const;

function consentStatusLabel(status: ConsentStatus): string {
  if (status === "granted") return "Ativadas";
  if (status === "revoked") return "Desativadas";
  return "Ainda não definido";
}

export function PrivacyPanel() {
  const status = useConsent();
  const [reloadHint, setReloadHint] = useState(false);

  function enable() {
    markConsentGrantPending();
    setConsent("granted");
    setReloadHint(false);
  }

  function disable() {
    setConsent("revoked");
    updateGtagConsentDenied();
    trackEvent({ name: "consent_revoked" });
    setReloadHint(true);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <SectionTitle>Privacidade e métricas</SectionTitle>
        <p className="text-sm text-muted mt-1">
          Seus dados financeiros continuam apenas no navegador. Métricas de uso
          são opcionais e ajudam a priorizar melhorias no produto.
        </p>
      </div>

      <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Google Analytics (GA4)</p>
            <p className="text-xs text-muted mt-0.5">
              Estado atual:{" "}
              <span className="text-foreground">
                {consentStatusLabel(status)}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            {status !== "granted" && (
              <Button variant="primary" size="sm" onClick={enable}>
                Ativar métricas
              </Button>
            )}
            {status === "granted" && (
              <Button variant="ghost" size="sm" onClick={disable}>
                Desativar métricas
              </Button>
            )}
          </div>
        </div>

        {reloadHint && (
          <p className="text-xs text-muted rounded-lg bg-surface-2 px-3 py-2">
            Métricas desativadas. Recarregue a página para garantir que nenhum
            script do Google Analytics permaneça em memória.
          </p>
        )}

        {status === "unset" && (
          <p className="text-xs text-muted">
            Na primeira visita, um aviso na parte inferior da tela pergunta se
            você deseja ativar as métricas.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl ring-1 ring-border/60 p-4">
          <p className="text-sm font-medium mb-2">O que pode ser coletado</p>
          <ul className="text-xs text-muted space-y-1.5 list-disc pl-4">
            {COLLECTED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl ring-1 ring-border/60 p-4">
          <p className="text-sm font-medium mb-2">O que nunca é coletado</p>
          <ul className="text-xs text-muted space-y-1.5 list-disc pl-4">
            {NOT_COLLECTED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-xs text-muted">
        O Vercel Analytics (hospedagem) pode registrar pageviews de forma
        agregada, independentemente desta configuração. Saiba mais na{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Política de Privacidade do Google
        </a>
        .
      </p>
    </div>
  );
}
