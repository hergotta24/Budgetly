import { formatCents } from "@/lib/money";
import { ColorDot } from "@/components/ui/Primitives";

export type BarListItem = {
  key: string;
  label: string;
  valueCents: number;
  color?: string;
  /** Secondary line under the label, e.g. a transaction count. */
  meta?: string;
};

/**
 * Horizontal bar list.
 *
 * Rendered as a definition list of real text plus a proportional bar, so the
 * numbers are readable by screen readers and at any viewport width without a
 * chart library.
 */
export function BarList({
  items,
  emptyLabel = "No spending to show.",
}: {
  items: BarListItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-subtle">{emptyLabel}</p>;
  }

  const max = items.reduce((acc, item) => Math.max(acc, item.valueCents), 0);

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const width = max === 0 ? 0 : Math.round((item.valueCents / max) * 100);
        return (
          <li key={item.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                {item.color ? <ColorDot color={item.color} /> : null}
                <span className="truncate">{item.label}</span>
              </span>
              <span className="tabular shrink-0 text-sm font-medium text-ink">
                {formatCents(item.valueCents)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                aria-hidden="true"
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(width, item.valueCents > 0 ? 2 : 0)}%`,
                  backgroundColor: item.color ?? "var(--brand)",
                }}
              />
            </div>
            {item.meta ? (
              <p className="text-xs text-ink-subtle">{item.meta}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
