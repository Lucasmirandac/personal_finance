import clsx from "clsx";
import { forwardRef } from "react";
import { fieldClasses } from "@/components/ui/Input";

export function sanitizeDecimal(input: string): string {
  const cleaned = input.replace(/[^\d.,]/g, "");
  const firstSep = cleaned.search(/[.,]/);
  if (firstSep === -1) return cleaned;
  const head = cleaned.slice(0, firstSep + 1);
  const tail = cleaned.slice(firstSep + 1).replace(/[.,]/g, "");
  return head + tail;
}

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onChange: (next: string) => void;
};

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onChange, onBlur, ...props }, ref) => (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      className={clsx(fieldClasses, "font-mono tabular-nums", className)}
      value={value}
      onChange={(e) => onChange(sanitizeDecimal(e.target.value))}
      onBlur={onBlur}
      {...props}
    />
  ),
);
MoneyInput.displayName = "MoneyInput";
