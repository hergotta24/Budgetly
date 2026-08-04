import type { Account, AppSettings, Category } from "./schema";

/** Stable id of the fallback category every uncategorized transaction points at. */
export const UNCATEGORIZED_ID = "cat-uncategorized";
/** Stable id of the default income category. */
export const INCOME_ID = "cat-income";
/** Stable id of the account used when a CSV has no account column. */
export const DEFAULT_ACCOUNT_ID = "acct-default";

export const SETTINGS_ID = "app-settings" as const;

/**
 * Default category set. `Income` and `Uncategorized` are system categories: they
 * cannot be deleted because the data model always needs somewhere to land.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "cat-housing",
    name: "Housing",
    color: "#7c6df2",
    kind: "expense",
    isSystem: false,
    sortOrder: 10,
  },
  {
    id: "cat-groceries",
    name: "Groceries",
    color: "#2f9e6e",
    kind: "expense",
    isSystem: false,
    sortOrder: 20,
  },
  {
    id: "cat-dining",
    name: "Dining",
    color: "#e07a3f",
    kind: "expense",
    isSystem: false,
    sortOrder: 30,
  },
  {
    id: "cat-transportation",
    name: "Transportation",
    color: "#3b82c4",
    kind: "expense",
    isSystem: false,
    sortOrder: 40,
  },
  {
    id: "cat-utilities",
    name: "Utilities",
    color: "#5b8bd0",
    kind: "expense",
    isSystem: false,
    sortOrder: 50,
  },
  {
    id: "cat-shopping",
    name: "Shopping",
    color: "#c85f9c",
    kind: "expense",
    isSystem: false,
    sortOrder: 60,
  },
  {
    id: "cat-entertainment",
    name: "Entertainment",
    color: "#9a6bd6",
    kind: "expense",
    isSystem: false,
    sortOrder: 70,
  },
  {
    id: "cat-health",
    name: "Health",
    color: "#d05f5f",
    kind: "expense",
    isSystem: false,
    sortOrder: 80,
  },
  {
    id: INCOME_ID,
    name: "Income",
    color: "#1f9d76",
    kind: "income",
    isSystem: true,
    sortOrder: 90,
  },
  {
    id: UNCATEGORIZED_ID,
    name: "Uncategorized",
    color: "#8a8f98",
    kind: "expense",
    isSystem: true,
    sortOrder: 100,
  },
];

export const DEFAULT_ACCOUNT: Account = {
  id: DEFAULT_ACCOUNT_ID,
  name: "Primary account",
  isDemo: false,
};

export const DEFAULT_SETTINGS: AppSettings = {
  id: SETTINGS_ID,
  theme: "system",
  defaultSignConvention: "negative-is-expense",
  defaultDateOrder: "mdy",
  onboardingCompleted: false,
};

/** Palette offered when creating a custom category. */
export const CATEGORY_COLORS = [
  "#7c6df2",
  "#2f9e6e",
  "#e07a3f",
  "#3b82c4",
  "#5b8bd0",
  "#c85f9c",
  "#9a6bd6",
  "#d05f5f",
  "#1f9d76",
  "#b08a2e",
  "#4aa3a3",
  "#8a8f98",
] as const;
