# Budgetly

Budgetly turns bank and credit-card CSV exports into a monthly budget — without
connecting a bank account, creating a login, or sending your financial data
anywhere.

Everything runs in the browser. Transactions, categories, budgets and settings
live in **IndexedDB on your device**; there is no server, no API and no analytics.

## Getting started

Requires **Node 20.19+** and **pnpm 10+**.

```bash
pnpm install
```

```bash
pnpm dev
```

Then open <http://localhost:3000>. On first run you can either **Try demo data**
(a fictional six-month dataset) or **Import a CSV**.

## Scripts

| Script                  | What it does                                                |
| ----------------------- | ----------------------------------------------------------- |
| `pnpm dev`              | Dev server with Turbopack                                   |
| `pnpm build`            | Production build                                            |
| `pnpm start`            | Serve the production build                                  |
| `pnpm lint`             | ESLint (Next core-web-vitals + TypeScript + React Compiler) |
| `pnpm typecheck`        | `tsc --noEmit` in strict mode                               |
| `pnpm test`             | Vitest unit and component tests                             |
| `pnpm test:watch`       | Vitest in watch mode                                        |
| `pnpm test:e2e`         | Playwright end-to-end tests (builds and serves first)       |
| `pnpm test:e2e:install` | Download the Chromium browser Playwright needs              |
| `pnpm format`           | Prettier write                                              |
| `pnpm format:check`     | Prettier check                                              |

Before the first `pnpm test:e2e`, run `pnpm test:e2e:install` once.

## Architecture

```
src/
  app/                    Next.js App Router. Route files are Server Components
                          that set metadata and render a client feature view.
  features/               One folder per route: the interactive Client Component
                          and its component tests.
  components/
    ui/                   Button, Card, Field, Dialog, Toast, primitives
    layout/               App shell, navigation, month picker, theme toggle
    charts/               Dependency-free bar list and trend chart
    AppDataProvider.tsx   Live snapshot of the whole local database
  lib/
    money.ts              Integer-cent parsing, formatting and budget math
    date.ts               Calendar-date parsing and formatting (timezone-safe)
    csv/                  Column detection, parsing, normalization,
                          fingerprints, import staging, CSV export
    db/                   Zod schemas, Dexie database, repository, backups,
                          demo dataset, defaults
    analytics/selectors.ts  Pure derivations for dashboard, budgets, reports
e2e/                      Playwright specs and CSV fixtures
```

### Key decisions

**Domain logic sits outside React.** Every rule that matters — how an amount is
parsed, what counts as a duplicate, how a budget's status is decided, what the
dashboard totals are — lives in a plain TypeScript module under `src/lib` and is
tested directly. React components read and render; they do not calculate.

**The repository layer owns all writes.** `src/lib/db/repo.ts` is the only place
that touches Dexie tables. That keeps rules like "deleting a category reassigns
its transactions" in one place, and means a hosted backend could later replace
this file without the UI changing.

**Zod schemas are the source of truth for types.** The domain types are inferred
from the schemas in `src/lib/db/schema.ts`, so the shapes that validate a restored
backup are the same shapes the app is written against.

**No Redux.** The previous attempt used Redux with `localStorage`. Budgetly now
reads the whole dataset through one `useLiveQuery` subscription in
`AppDataProvider`. Personal CSV exports are small enough to hold in memory, and a
single in-memory snapshot is what guarantees the dashboard, transactions table and
reports are computed from exactly the same rows.

**Charts are hand-rolled.** The category breakdown is a list of real text plus a
proportional bar; the trend chart is a `viewBox` SVG paired with a visually hidden
data table. This avoids a charting dependency, scales to any width without
measuring the DOM, and keeps every figure available as text.

### Money

All monetary values are stored and computed as **integer cents**. Amounts are
never held as floating-point dollars and never summed as floats.

The sign convention, from the account holder's point of view:

- **negative** — money left the account (expense, debit, withdrawal)
- **positive** — money entered the account (income, credit, deposit)

Category spend and budget figures are positive magnitudes derived from negative
transaction amounts. Income-kind categories are excluded from spending totals, so
a paycheck never consumes an expense budget. Refunds inside a category reduce that
category's spend and never push it below zero.

Covered by `src/lib/money.test.ts` and `src/lib/analytics/selectors.test.ts`.

### Dates

Transaction dates are plain `YYYY-MM-DD` calendar strings, never timestamps, and
all formatting is done in UTC — a transaction cannot drift across a day boundary
because of the viewer's timezone.

## CSV format guidance

Budgetly needs a header row and at least a **date**, a **description** and an
**amount**. Columns are detected automatically and you can correct any of them on
the mapping step.

**Amounts** may be one signed column, or separate debit and credit columns. These
are all understood:

```
1234.56    $1,234.56    -24.50    (24.50)    24.50-    USD 1,234.56    1.234,56
```

If your card statement lists charges as positive numbers, switch **Sign
convention** to "Positive amounts are expenses" on the mapping step.

**Dates** may be `2026-03-14`, `03/14/2026`, `14/03/2026`, `2026/03/14`,
`Mar 14, 2026` or `14 Mar 2026`. For ambiguous numeric dates like `03/04/2026`,
choose month-first or day-first (the default is configurable in Settings).

**Optional columns:** an account column groups transactions by account; a category
column is matched, case-insensitively, against your existing category names.

**Duplicates** are detected with a deterministic fingerprint of the normalized
date, description, amount and account. Matches against transactions you already
have, and repeats within the same file, are both flagged and **skipped by
default** — you review them and tick any you want anyway.

Rows that cannot be read (missing date, empty description, unparseable or zero
amount) are always skipped, each with an explanation.

A Budgetly CSV export is itself a valid Budgetly import.

## Privacy model

- No account, no server, no bank connection, no telemetry.
- CSV files are read with the browser's `File` API and parsed on the page — no
  bytes are uploaded.
- Data is stored in IndexedDB under the database name `budgetly`.
- Clearing site data, using private browsing, or switching browser or device
  means starting fresh. Use **Export → Download backup** to move data.
- **Settings & data → Reset all data** erases every record after a confirmation.

## Testing

```bash
pnpm test
```

Unit and component tests run under Vitest with jsdom and `fake-indexeddb`. They
cover money parsing and arithmetic, date parsing, CSV column detection and
normalization, duplicate fingerprints, import staging, the analytics selectors,
the repository (including category reassignment, budget upserts and backup
round-trips), and two feature views driven through the real providers against a
real IndexedDB.

```bash
pnpm test:e2e
```

The critical Playwright journey (`e2e/budgetly.spec.ts`) starts from an empty app
and: imports a CSV fixture through column mapping and preview, categorizes a
transaction, sets a budget for that category in the transaction's month, checks
the dashboard reflects both, reloads the browser to confirm persistence, downloads
a JSON backup, resets all data, then restores the backup and confirms the data
returns. Two shorter specs cover the demo-data lifecycle and mobile navigation.

`e2e/screenshots.spec.ts` is not an assertion suite — it captures the app at 375px
and 1440px, in light and dark themes, into `screenshots/` for design review:

```bash
pnpm exec playwright test screenshots
```

## Known limitations

- **Single currency.** Everything is formatted and totalled as USD. There is no
  multi-currency accounting and no exchange rates.
- **Single device.** Data lives in one browser profile. Moving between devices
  means exporting and restoring a JSON backup by hand.
- **Import does not create categories.** A category column is matched against
  categories that already exist; unmatched values import as Uncategorized (or
  Income for positive amounts) with a note on the preview, and can be fixed in
  bulk on the Transactions page.
- **No recurring-transaction detection**, rules, or automatic categorization.
- **Filters are single-select.** The data model stores category and account
  filters as arrays, but the UI currently exposes one of each.
- **Whole dataset in memory.** Fine for personal CSV exports; a dataset in the
  hundreds of thousands of rows would need paged queries.
- **Undo is toast-scoped.** Deleting a transaction can be undone from the toast,
  but there is no general undo history.
- **No backup migrations yet.** Restore accepts schema version 1 only; a future
  version bump will need a migration path.

## Post-MVP ideas

Rules-based auto-categorization, recurring-transaction detection, multi-select
filters, savings goals, budget rollover, per-bank import presets, and an optional
encrypted sync backend introduced behind the existing repository layer.
