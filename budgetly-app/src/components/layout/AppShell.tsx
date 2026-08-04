"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import { useAppData } from "@/components/AppDataProvider";
import {
  BudgetlyLogo,
  BudgetsIcon,
  CloseIcon,
  DashboardIcon,
  ExportIcon,
  ImportIcon,
  MenuIcon,
  ReportsIcon,
  SettingsIcon,
  ShieldIcon,
  TransactionsIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: DashboardIcon },
  { href: "/transactions", label: "Transactions", Icon: TransactionsIcon },
  { href: "/import", label: "Import", Icon: ImportIcon },
  { href: "/budgets", label: "Budgets", Icon: BudgetsIcon },
  { href: "/reports", label: "Reports", Icon: ReportsIcon },
  { href: "/export", label: "Export", Icon: ExportIcon },
  { href: "/settings", label: "Settings & data", Icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-soft text-brand"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function PrivacyNote() {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-xs leading-5 text-ink-subtle">
      <ShieldIcon className="mt-px size-4 shrink-0" />
      <span>
        Your financial data stays in this browser. Budgetly has no account and no
        server.
      </span>
    </p>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { transactions, ready } = useAppData();

  // The drawer is remembered against the route it was opened on, so any
  // navigation — including browser back/forward — closes it without an effect.
  const [menu, setMenu] = useState({ open: false, path: pathname });
  const menuOpen = menu.open && menu.path === pathname;
  const setMenuOpen = (open: boolean) => setMenu({ open, path: pathname });

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only-focusable fixed top-3 left-3 z-50 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-ink"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-line-subtle bg-surface px-3 py-4 lg:flex">
          <Link href="/" className="px-2 py-1">
            <BudgetlyLogo />
            <span className="sr-only">Budgetly home</span>
          </Link>
          <nav aria-label="Main" className="flex-1">
            <NavList />
          </nav>
          <div className="flex flex-col gap-3">
            <PrivacyNote />
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-ink-subtle">
                {ready ? `${transactions.length} transactions` : "Loading…"}
              </span>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line-subtle bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
            <Link href="/">
              <BudgetlyLogo />
              <span className="sr-only">Budgetly home</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                className="rounded-lg border border-line p-2 text-ink-muted hover:text-ink"
              >
                {menuOpen ? (
                  <CloseIcon className="size-5" />
                ) : (
                  <MenuIcon className="size-5" />
                )}
                <span className="sr-only">
                  {menuOpen ? "Close navigation" : "Open navigation"}
                </span>
              </button>
            </div>
          </header>

          {menuOpen ? (
            <nav
              id="mobile-nav"
              aria-label="Main"
              className="border-b border-line-subtle bg-surface px-3 py-3 lg:hidden"
            >
              <NavList onNavigate={() => setMenuOpen(false)} />
              <div className="mt-3">
                <PrivacyNote />
              </div>
            </nav>
          ) : null}

          <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

/** Consistent page title block used at the top of every route. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
