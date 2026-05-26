"use client";

import { useEffect, useState } from "react";
import { isoToBr, parseBrDate, parseIsoDate } from "@/lib/csv";
import { TransactionEditPatch } from "@/lib/edits";
import { TransactionRaw } from "@/lib/types";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  original: TransactionRaw;
  current: TransactionRaw;
  canRevert: boolean;
  onSave: (patch: TransactionEditPatch) => void;
  onRevert: () => void;
  onClose: () => void;
};

function toDateInputValue(data: string): string {
  const iso = parseBrDate(data) ?? parseIsoDate(data);
  return iso ?? "";
}

function fromDateInputValue(iso: string): string {
  if (!iso) return "";
  return isoToBr(iso);
}

export function TransactionEditModal({
  open,
  original,
  current,
  canRevert,
  onSave,
  onRevert,
  onClose,
}: Props) {
  const [dataIso, setDataIso] = useState("");
  const [lancamento, setLancamento] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("");
  const [valorStr, setValorStr] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDataIso(toDateInputValue(current.data));
    setLancamento(current.lancamento);
    setCategoria(current.categoria);
    setTipo(current.tipo);
    setValorStr(String(current.valorOriginal));
    setError(null);
  }, [open, current]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataIso) {
      setError("Informe uma data válida.");
      return;
    }
    const data = fromDateInputValue(dataIso);
    if (!parseBrDate(data)) {
      setError("Data inválida.");
      return;
    }
    if (!lancamento.trim()) {
      setError("Informe o lançamento.");
      return;
    }
    const valor = Number(valorStr.replace(",", "."));
    if (Number.isNaN(valor)) {
      setError("Valor inválido.");
      return;
    }

    const patch: TransactionEditPatch = {};
    if (data !== original.data) patch.data = data;
    if (lancamento.trim() !== original.lancamento) patch.lancamento = lancamento.trim();
    if (categoria.trim() !== original.categoria) patch.categoria = categoria.trim();
    if (tipo.trim() !== original.tipo) patch.tipo = tipo.trim();
    if (valor !== original.valorOriginal) patch.valorOriginal = valor;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    onSave(patch);
    onClose();
  };

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-md mx-4 p-4 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-tx-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="edit-tx-title" className="section-title">
              Editar transação
            </h2>
            <p className="subtle text-xs mt-0.5">
              Alterações não modificam o CSV original.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs subtle">Data</span>
            <input
              type="date"
              className="input w-full"
              value={dataIso}
              onChange={(e) => setDataIso(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs subtle">Lançamento</span>
            <input
              type="text"
              className="input w-full"
              value={lancamento}
              onChange={(e) => setLancamento(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs subtle">Categoria</span>
            <input
              type="text"
              className="input w-full"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs subtle">Tipo</span>
            <input
              type="text"
              className="input w-full"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs subtle">Valor original (R$)</span>
            <input
              type="text"
              className="input w-full num"
              value={valorStr}
              onChange={(e) => setValorStr(e.target.value)}
              inputMode="decimal"
              required
            />
          </label>

          {error && (
            <p className="text-xs text-[var(--danger)]">{error}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" className="btn btn-primary btn-sm">
              Salvar
            </button>
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Cancelar
            </button>
            {canRevert && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  onRevert();
                  onClose();
                }}
              >
                Reverter para original
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
