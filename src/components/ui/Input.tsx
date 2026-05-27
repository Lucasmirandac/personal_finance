import clsx from "clsx"
import { forwardRef } from "react"

const fieldClasses =
  "bg-surface border border-border rounded-md px-2.5 py-1.5 text-[13px] text-foreground w-full focus:outline focus:outline-1 focus:outline-border-strong focus:border-border-strong"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={clsx(fieldClasses, className)} {...props} />
  ),
)
Input.displayName = "Input"

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={clsx(fieldClasses, className)} {...props} />
  ),
)
Select.displayName = "Select"

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={clsx(fieldClasses, className)} {...props} />
  ),
)
Textarea.displayName = "Textarea"
