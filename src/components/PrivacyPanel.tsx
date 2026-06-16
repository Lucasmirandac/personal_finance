"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SupportLink } from "@/components/SupportLink";
import { trackEvent, updateGtagConsentDenied } from "@/lib/analytics";
import { APOIA_SE_TAGLINE } from "@/lib/marketing/links";
import { useAppStore } from "@/lib/store";
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
  "Sincronização na nuvem conectada, enviada ou em conflito (provedor e resultado, sem conteúdo)",
  "Orçamento criado ou sugestão aceita (apenas contagem)",
  "Fechamento de mês e conquistas desbloqueadas (IDs internos)",
] as const;

const NOT_COLLECTED = [
  "Valores monetários, saldos ou limites de orçamento",
  "Descrições de lançamentos ou nomes de estabelecimentos",
  "Conteúdo de CSV ou backups",
  "Conteúdo do blob criptografado na nuvem",
  "Senha de criptografia da sincronização",
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
  const { settings, confirmSupporter } = useAppStore();
  const [reloadHint, setReloadHint] = useState(false);
  const supporterConfirmed = Boolean(settings.supporterConfirmedAt);

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
          Seus dados financeiros continuam criptografados no seu dispositivo.
          Sync na nuvem (opcional) envia apenas um blob opaco para a conta do
          usuário. Métricas de uso são opcionais e ajudam a priorizar melhorias
          no produto.
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
          Política de Privacidade do Google.
        </a>
      </p>

      <div className="rounded-2xl ring-1 ring-border/60 p-4 sm:p-5 space-y-3">
        <div>
          <p className="text-sm font-medium">Projeto independente</p>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            {APOIA_SE_TAGLINE} Este app não monetiza seus dados; o apoio é
            voluntário e o Saldo Real continua gratuito.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SupportLink
            surface="config_privacy"
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
          >
            Conhecer no APOIA.se
          </SupportLink>
          {supporterConfirmed ? (
            <span className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1.5 text-xs text-muted">
              Apoio confirmado localmente
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                void confirmSupporter();
                trackEvent({
                  name: "supporter_confirmed",
                  surface: "config_privacy",
                });
              }}
            >
              Confirmo que contribuí no APOIA.se
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
