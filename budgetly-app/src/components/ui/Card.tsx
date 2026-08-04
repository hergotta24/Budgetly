import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line-subtle bg-surface shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  actions,
  headingLevel = 2,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line-subtle px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading className="text-sm font-semibold text-ink">{title}</Heading>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-subtle">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}
