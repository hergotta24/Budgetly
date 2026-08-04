import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-brand-hover active:bg-brand-active",
  secondary:
    "bg-surface text-ink border border-line hover:bg-surface-muted active:bg-surface-muted",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90 active:opacity-80",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}
