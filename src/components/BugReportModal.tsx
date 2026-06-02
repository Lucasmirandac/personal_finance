"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import {
  getAppVersion,
  getSupportEmail,
  MAILTO_MAX_ENCODED_BODY_LENGTH,
} from "@/lib/support";
import { Button } from "@/components/ui/Button";
import { DrawerBackdrop } from "@/components/ui/Drawer";
import { Input, Textarea } from "@/components/ui/Input";
import { Copy, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

function buildTechnicalBlock(): string {
  const href =
    typeof globalThis.location !== "undefined"
      ? globalThis.location.href
      : "—";
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : "—";
  const language =
    typeof navigator !== "undefined" ? navigator.language : "—";

  return [
    "",
    "--- Informações técnicas ---",
    `Versão do app: ${getAppVersion()}`,
    `URL atual: ${href}`,
    `User agent: ${userAgent}`,
    `Idioma: ${language}`,
    `Data/hora: ${new Date().toISOString()}`,
  ].join("\n");
}

function buildReportBody(description: string, includeTechnical: boolean): string {
  const trimmed = description.trim();
  if (!includeTechnical) return trimmed;
  return `${trimmed}${buildTechnicalBlock()}`;
}

function buildMailtoHref(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${email}?${params.toString()}`;
}

export function BugReportModal({ open, onClose }: Readonly<Props>) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [includeTechnical, setIncludeTechnical] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setIncludeTechnical(true);
    setError(null);
    setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useFocusTrap(open, dialogRef);

  const reportPreview = useMemo(() => {
    const subject = `[Saldo Real] Bug: ${title.trim() || "…"}`;
    const body = buildReportBody(description, includeTechnical);
    const encodedBodyLength = encodeURIComponent(body).length;
    const tooLong = encodedBodyLength > MAILTO_MAX_ENCODED_BODY_LENGTH;
    return { subject, body, tooLong };
  }, [title, description, includeTechnical]);

  if (!open) return null;

  const handleSend = () => {
    setError(null);
    setCopied(false);

    if (!title.trim()) {
      setError("Informe um título para o bug.");
      return;
    }

    if (reportPreview.tooLong) {
      setError(
        "Texto longo demais para enviar pelo cliente padrão; encurte a descrição.",
      );
      return;
    }

    const href = buildMailtoHref(
      getSupportEmail(),
      reportPreview.subject,
      reportPreview.body,
    );
    globalThis.location.href = href;
    onClose();
  };

  const handleCopy = async () => {
    const text = `Para: ${getSupportEmail()}\nAssunto: ${reportPreview.subject}\n\n${reportPreview.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);
    } catch {
      setError("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  return (
    <DrawerBackdrop
      className="flex items-center justify-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-surface border border-border rounded-lg w-full max-w-md mx-4 p-4 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-report-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="bug-report-title"
              className="text-[11px] font-semibold tracking-wider uppercase text-muted"
            >
              Reportar bug
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Abre seu app de e-mail. Nada é enviado automaticamente pelo Saldo Real.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={14} />
          </Button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
        >
          <label className="block space-y-1">
            <span className="text-xs text-muted">Título</span>
            <Input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Saldo não atualiza após ajuste"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted">Descrição</span>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="O que aconteceu? O que você esperava?"
              rows={4}
            />
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={includeTechnical}
              onChange={(event) => setIncludeTechnical(event.target.checked)}
            />
            <span>
              Incluir informações técnicas (versão, navegador, URL atual)
            </span>
          </label>

          {error && <p className="text-xs text-danger">{error}</p>}
          {copied && (
            <p className="text-xs text-success">Texto copiado para a área de transferência.</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" variant="primary" size="sm">
              Enviar pelo e-mail
            </Button>
            {reportPreview.tooLong && (
              <Button type="button" size="sm" onClick={handleCopy}>
                <Copy size={13} />
                Copiar texto
              </Button>
            )}
            <Button type="button" size="sm" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </DrawerBackdrop>
  );
}
