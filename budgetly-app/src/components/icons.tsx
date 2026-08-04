import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const DashboardIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="10" width="7" height="11" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </Icon>
);

export const TransactionsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h13" />
    <path d="m14 4 3 3-3 3" />
    <path d="M20 17H7" />
    <path d="m10 14-3 3 3 3" />
  </Icon>
);

export const ImportIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 15V3" />
    <path d="m7 8 5-5 5 5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Icon>
);

export const BudgetsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v8.5h8.5" />
  </Icon>
);

export const ReportsIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 16v-5" />
    <path d="M13 16V7" />
    <path d="M18 16v-8" />
  </Icon>
);

export const ExportIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Icon>
);

export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.11a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.11a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.11a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.11a1.6 1.6 0 0 0-1.47.97Z" />
  </Icon>
);

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Icon>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m14 6-6 6 6 6" />
  </Icon>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m10 6 6 6-6 6" />
  </Icon>
);

export const TrashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="m6 7 .8 12.1A2 2 0 0 0 8.8 21h6.4a2 2 0 0 0 2-1.9L18 7" />
  </Icon>
);

export const EditIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 6.5 3 3" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
);

export const WarningIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
);

export const SunIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const MoonIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Icon>
);

export const MonitorIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8" />
    <path d="M12 16v4" />
  </Icon>
);

export const ShieldIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3 5 6v6c0 4.4 3 7.9 7 9 4-1.1 7-4.6 7-9V6l-7-3Z" />
    <path d="m9.5 12 1.8 1.8 3.4-3.6" />
  </Icon>
);

export const FileIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5" />
  </Icon>
);

/** Budgetly wordmark lockup. */
export function BudgetlyLogo({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="bg-brand text-brand-ink grid size-7 shrink-0 place-items-center rounded-lg text-[13px] font-bold"
        >
          B
        </span>
        <span className="text-ink text-[15px] font-semibold tracking-tight">
          Budgetly
        </span>
      </span>
    </span>
  );
}
