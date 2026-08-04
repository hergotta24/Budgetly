"use client";

import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink " +
  "placeholder:text-ink-subtle transition-colors hover:border-line-strong " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink"
    >
      <span>{children}</span>
      {hint ? (
        <span className="text-xs font-normal text-ink-subtle">{hint}</span>
      ) : null}
    </label>
  );
}

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Renders the label for assistive tech only. */
  hideLabel?: boolean;
};

export function TextField({
  label,
  hint,
  error,
  hideLabel,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {hideLabel ? (
        <label htmlFor={fieldId} className="sr-only">
          {label}
        </label>
      ) : (
        <Label htmlFor={fieldId} hint={hint}>
          {label}
        </Label>
      )}
      <input
        id={fieldId}
        className={cn(CONTROL, "h-10", error && "border-danger", className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: ReactNode;
  hideLabel?: boolean;
  children: ReactNode;
};

export function SelectField({
  label,
  hint,
  hideLabel,
  className,
  id,
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {hideLabel ? (
        <label htmlFor={fieldId} className="sr-only">
          {label}
        </label>
      ) : (
        <Label htmlFor={fieldId} hint={hint}>
          {label}
        </Label>
      )}
      <select id={fieldId} className={cn(CONTROL, "h-10 pr-8", className)} {...props}>
        {children}
      </select>
    </div>
  );
}

export type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: ReactNode;
};

export function TextAreaField({
  label,
  hint,
  className,
  id,
  ...props
}: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId} hint={hint}>
        {label}
      </Label>
      <textarea
        id={fieldId}
        className={cn(CONTROL, "min-h-20 py-2 leading-6", className)}
        {...props}
      />
    </div>
  );
}
