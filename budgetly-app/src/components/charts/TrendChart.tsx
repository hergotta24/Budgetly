import { formatMonth, formatMonthShort } from "@/lib/date";
import { formatCents } from "@/lib/money";
import type { TrendPoint } from "@/lib/analytics/selectors";

const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 220;
const PADDING = { top: 12, right: 8, bottom: 28, left: 8 };

/**
 * Month-over-month income vs. expenses.
 *
 * Drawn as a plain `viewBox` SVG so it scales to any width without measuring the
 * DOM, and paired with a visually hidden data table so the same figures are
 * available to screen readers and in text form.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const max = points.reduce(
    (acc, point) => Math.max(acc, point.incomeCents, point.expenseCents),
    0,
  );

  const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
  const slot = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.min(26, slot * 0.32);
  const gap = 4;

  const scale = (cents: number) =>
    max === 0 ? 0 : Math.max(2, (cents / max) * plotHeight);

  const summary = `Monthly income and expenses from ${
    points[0] ? formatMonth(points[0].month) : ""
  } to ${points.at(-1) ? formatMonth(points.at(-1)!.month) : ""}.`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="bg-income size-2.5 rounded-sm" aria-hidden="true" />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-brand size-2.5 rounded-sm" aria-hidden="true" />
          Expenses
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={summary}
        className="h-48 w-full"
        preserveAspectRatio="none"
      >
        <line
          x1={PADDING.left}
          y1={PADDING.top + plotHeight}
          x2={VIEW_WIDTH - PADDING.right}
          y2={PADDING.top + plotHeight}
          stroke="var(--line)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point, index) => {
          const center = PADDING.left + slot * index + slot / 2;
          const incomeHeight = point.incomeCents > 0 ? scale(point.incomeCents) : 0;
          const expenseHeight = point.expenseCents > 0 ? scale(point.expenseCents) : 0;
          const baseline = PADDING.top + plotHeight;

          return (
            <g key={point.month}>
              {incomeHeight > 0 ? (
                <rect
                  x={center - barWidth - gap / 2}
                  y={baseline - incomeHeight}
                  width={barWidth}
                  height={incomeHeight}
                  rx="2"
                  fill="var(--income)"
                />
              ) : null}
              {expenseHeight > 0 ? (
                <rect
                  x={center + gap / 2}
                  y={baseline - expenseHeight}
                  width={barWidth}
                  height={expenseHeight}
                  rx="2"
                  fill="var(--brand)"
                />
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }}>
        {points.map((point) => (
          <span
            key={point.month}
            className="truncate text-center text-xs text-ink-subtle"
          >
            {formatMonthShort(point.month)}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Income</th>
            <th scope="col">Expenses</th>
            <th scope="col">Net</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{formatMonth(point.month)}</th>
              <td>{formatCents(point.incomeCents)}</td>
              <td>{formatCents(point.expenseCents)}</td>
              <td>{formatCents(point.netCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
