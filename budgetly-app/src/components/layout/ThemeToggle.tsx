"use client";

import { useAppData } from "@/components/AppDataProvider";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Theme } from "@/lib/db/schema";

const OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
];

export function ThemeToggle() {
  const { theme, setTheme } = useAppData();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex rounded-lg border border-line bg-surface-muted p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              selected
                ? "bg-surface text-ink shadow-card"
                : "text-ink-subtle hover:text-ink",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
