import clsx from "clsx";
import { forwardRef } from "react";
import { fieldClasses } from "@/components/ui/Input";

export function sanitizeInteger(input: string): string {
  return input.replace(/\D/g, "");
}

function clampInteger(value: string, min?: number, max?: number): string {
  if (!value) return value;
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  let clamped = n;
  if (min !== undefined) clamped = Math.max(min, clamped);
  if (max !== undefined) clamped = Math.min(max, clamped);
  return String(clamped);
}

type IntegerInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode" | "pattern"
> & {
  value: string | number;
  onChange: (next: string) => void;
  min?: number;
  max?: number;
};

export const IntegerInput = forwardRef<HTMLInputElement, IntegerInputProps>(
  (
    { className, value, onChange, onBlur, min, max, ...props },
    ref,
  ) => {
    const displayValue = value === "" ? "" : String(value);

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={clsx(fieldClasses, className)}
        value={displayValue}
        onChange={(e) => onChange(sanitizeInteger(e.target.value))}
        onBlur={(e) => {
          const clamped = clampInteger(e.target.value, min, max);
          if (clamped !== e.target.value) onChange(clamped);
          onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);
IntegerInput.displayName = "IntegerInput";
