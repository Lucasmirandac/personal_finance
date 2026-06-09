"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatBRL } from "@/lib/format";
import { g } from "@/lib/glossary";
import { resolveAporteMensal } from "@/lib/savings";
import {
  WEALTH_META_DEFAULT,
  WEALTH_META_MAX,
  WEALTH_META_MIN,
  WEALTH_META_STEP,
} from "@/lib/wealth";
import { SavingsMode, SavingsPreference } from "@/lib/types";

type Props = {
  rendaDisponivel: number;
  initial: SavingsPreference | null;
  onSave: (pref: SavingsPreference) => Promise<void>;
  onRemove?: () => Promise<void>;
  onCancel?: () => void;
  showRemove?: boolean;
  compact?: boolean;
};

function defaultFormState(initial: SavingsPreference | null): {
  modo: SavingsMode;
  percentual: number;
  valorMensal: string;
} {
  if (!initial) {
    return {
      modo: "percent",
      percentual: WEALTH_META_DEFAULT,
      valorMensal: "",
    };
  }
  if (initial.modo === "fixed") {
    return {
      modo: "fixed",
      percentual: WEALTH_META_DEFAULT,
      valorMensal: String(initial.valorMensal ?? ""),
    };
  }
  return {
    modo: "percent",
    percentual: initial.percentual ?? WEALTH_META_DEFAULT,
    valorMensal: "",
  };
}

export function SavingsGoalForm({
  rendaDisponivel,
  initial,
  onSave,
  onRemove,
  onCancel,
  showRemove = false,
  compact = false,
}: Props) {
  const [modo, setModo] = useState<SavingsMode>(() => defaultFormState(initial).modo);
  const [percentual, setPercentual] = useState(
    () => defaultFormState(initial).percentual,
  );
  const [valorMensal, setValorMensal] = useState(
    () => defaultFormState(initial).valorMensal,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    if (modo === "percent") {
      return resolveAporteMensal(rendaDisponivel, { modo: "percent", percentual });
    }
    const valor = parseFloat(valorMensal.replace(",", "."));
    if (Number.isNaN(valor) || valor <= 0) {
      return resolveAporteMensal(rendaDisponivel, null);
    }
    return resolveAporteMensal(rendaDisponivel, { modo: "fixed", valorMensal: valor });
  }, [modo, percentual, valorMensal, rendaDisponivel]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let pref: SavingsPreference;
    if (modo === "percent") {
      pref = { modo: "percent", percentual };
    } else {
      const valor = parseFloat(valorMensal.replace(",", "."));
      if (Number.isNaN(valor) || valor <= 0) {
        setError("Informe um valor mensal válido.");
        return;
      }
      if (valor > rendaDisponivel) {
        setError(
          `A reserva não pode ser maior que a renda disponível (${formatBRL(rendaDisponivel)}).`,
        );
        return;
      }
      pref = { modo: "fixed", valorMensal: valor };
    }

    setSaving(true);
    try {
      await onSave(pref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!onRemove) return;
    setSaving(true);
    try {
      await onRemove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={clsx("space-y-3", compact && "space-y-2")}>
      <div className="space-y-1.5">
        <span className="text-xs text-muted">Como definir a reserva</span>
        <SegmentedControl<SavingsMode>
          size="sm"
          value={modo}
          onChange={setModo}
          options={[
            { value: "percent", label: "Percentual" },
            { value: "fixed", label: "Valor fixo" },
          ]}
        />
      </div>

      {modo === "percent" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="savings-percent-slider"
              className="text-xs text-muted"
            >
              {g("metaPoupanca")}
            </label>
            <span className="text-sm font-semibold tabular-nums">{percentual}%</span>
          </div>
          <input
            id="savings-percent-slider"
            type="range"
            min={WEALTH_META_MIN}
            max={WEALTH_META_MAX}
            step={WEALTH_META_STEP}
            value={percentual}
            onChange={(e) => setPercentual(Number(e.target.value))}
            className="w-full accent-[var(--foreground)]"
            aria-valuemin={WEALTH_META_MIN}
            aria-valuemax={WEALTH_META_MAX}
            aria-valuenow={percentual}
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>{WEALTH_META_MIN}%</span>
            <span>{WEALTH_META_MAX}%</span>
          </div>
        </div>
      ) : (
        <label className="block space-y-1">
          <span className="text-xs text-muted">Valor mensal (R$)</span>
          <MoneyInput
            value={valorMensal}
            onChange={setValorMensal}
            placeholder="0,00"
          />
          {preview.percentualEfetivo != null && preview.aporteMensal > 0 && (
            <span className="text-[11px] text-muted">
              Equivale a {preview.percentualEfetivo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da sua renda disponível.
            </span>
          )}
        </label>
      )}

      {preview.aporteMensal > 0 && (
        <p className="text-xs text-muted">
          Aporte mensal:{" "}
          <strong className="text-foreground">{formatBRL(preview.aporteMensal)}</strong>
        </p>
      )}

      {error && (
        <p className="text-xs text-[var(--system-red)]" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="rounded-full"
          disabled={saving}
        >
          Salvar
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </Button>
        )}
        {showRemove && onRemove && initial && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-danger"
            onClick={handleRemove}
            disabled={saving}
          >
            Remover meta
          </Button>
        )}
      </div>
    </form>
  );
}
