"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { BudgetlyLogo, ImportIcon, ShieldIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { loadDemoData } from "@/lib/db/demo";
import { updateSettings } from "@/lib/db/repo";

const STEPS = [
  {
    title: "Import a CSV",
    body: "Drop in an export from your bank or credit card. Budgetly reads it in this browser and never uploads it.",
  },
  {
    title: "Categorize and budget",
    body: "Clean up categories in bulk, then set a monthly limit for the ones you want to keep an eye on.",
  },
  {
    title: "See where the money went",
    body: "The dashboard and reports are calculated from your transactions — no manual spreadsheet upkeep.",
  },
];

/** First-run welcome shown until the user loads demo data or imports a file. */
export function Onboarding() {
  const { transactions } = useAppData();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleDemo() {
    setBusy(true);
    try {
      const dataset = await loadDemoData();
      await updateSettings({ onboardingCompleted: true });
      showToast({
        tone: "success",
        message: `Loaded ${dataset.transactions.length} demo transactions across ${dataset.months.length} months.`,
      });
    } catch {
      showToast({ tone: "danger", message: "Could not load the demo data." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-line-subtle bg-surface p-6 shadow-card sm:p-8">
        <BudgetlyLogo />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Turn a CSV export into a budget you actually use.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">
          Budgetly is a local-first budgeting app. There is no account to create and no
          bank to connect — you bring the CSV, and everything is calculated here.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={handleDemo} disabled={busy}>
            {busy ? "Loading demo…" : "Try demo data"}
          </Button>
          <Link
            href="/import"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-muted"
          >
            <ImportIcon className="size-4" />
            Import a CSV
          </Link>
        </div>

        <p className="mt-3 text-xs text-ink-subtle">
          Demo data is clearly fictional and can be removed at any time from{" "}
          <Link href="/settings" className="underline underline-offset-2">
            Settings &amp; data
          </Link>
          .
        </p>

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-line-subtle bg-surface-muted p-4">
          <ShieldIcon className="mt-0.5 size-5 shrink-0 text-brand" />
          <div className="text-sm">
            <p className="font-medium text-ink">Your data stays in this browser</p>
            <p className="mt-1 text-ink-muted">
              Transactions, budgets and settings are stored in this browser&apos;s
              IndexedDB. Nothing is uploaded, and clearing your browser data (or using a
              different browser or device) means starting fresh — export a backup from
              the Export page to move your data.
            </p>
          </div>
        </div>

        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-1.5">
              <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-ink">{step.title}</span>
              <span className="text-sm leading-6 text-ink-subtle">{step.body}</span>
            </li>
          ))}
        </ol>

        {transactions.length > 0 ? (
          <p className="mt-6 text-sm text-ink-muted">
            You already have {transactions.length} transactions saved.
          </p>
        ) : null}
      </div>
    </div>
  );
}
