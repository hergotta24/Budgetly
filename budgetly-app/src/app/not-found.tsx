import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-line-subtle bg-surface p-8 text-center shadow-card">
      <h1 className="text-lg font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-muted">
        That route does not exist in Budgetly.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink hover:bg-brand-hover"
      >
        Back to the dashboard
      </Link>
    </div>
  );
}
