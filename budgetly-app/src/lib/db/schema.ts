import { z } from "zod";

/**
 * Runtime schemas for every persisted Budgetly record.
 *
 * These are the single source of truth for the domain types: the TypeScript types
 * are inferred from the schemas, and the same schemas validate JSON backups
 * before they are restored.
 */

/** Bumped whenever the backup envelope or record shapes change incompatibly. */
export const BACKUP_SCHEMA_VERSION = 1;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

const isoMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected a YYYY-MM month");

const isoTimestamp = z.string().min(1);

const id = z.string().min(1);

const cents = z
  .number()
  .int("Monetary values must be whole cents")
  .finite()
  .safe();

export const categoryKindSchema = z.enum(["expense", "income"]);

export const categorySchema = z.object({
  id,
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a #rrggbb color"),
  kind: categoryKindSchema,
  /** System categories (Income, Uncategorized) cannot be deleted. */
  isSystem: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const accountSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  isDemo: z.boolean().default(false),
});

export const transactionSchema = z.object({
  id,
  date: isoDate,
  description: z.string().trim().min(1).max(400),
  /** Negative = money out (expense), positive = money in (income). */
  amountCents: cents,
  categoryId: id,
  accountId: id,
  notes: z.string().max(1000).default(""),
  sourceImportId: id.nullable().default(null),
  /** Deterministic hash of date + normalized description + amount + account. */
  fingerprint: z.string().min(1),
  isDemo: z.boolean().default(false),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const monthlyBudgetSchema = z.object({
  id,
  month: isoMonth,
  categoryId: id,
  limitCents: cents.nonnegative(),
  isDemo: z.boolean().default(false),
});

export const columnMappingSchema = z.object({
  date: z.string(),
  description: z.string(),
  /** Either a single signed amount column, or separate debit/credit columns. */
  amountMode: z.enum(["single", "debit-credit"]),
  amount: z.string().nullable().default(null),
  debit: z.string().nullable().default(null),
  credit: z.string().nullable().default(null),
  account: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  /** `"negative-is-expense"` means the file already uses our sign convention. */
  signConvention: z.enum(["negative-is-expense", "positive-is-expense"]),
  dateOrder: z.enum(["auto", "mdy", "dmy"]),
});

export const importRecordSchema = z.object({
  id,
  filename: z.string().min(1),
  importedAt: isoTimestamp,
  importedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  mapping: columnMappingSchema.nullable().default(null),
  isDemo: z.boolean().default(false),
});

export const themeSchema = z.enum(["light", "dark", "system"]);

export const appSettingsSchema = z.object({
  id: z.literal("app-settings"),
  theme: themeSchema.default("system"),
  /** Default sign convention offered on the import mapping step. */
  defaultSignConvention: z
    .enum(["negative-is-expense", "positive-is-expense"])
    .default("negative-is-expense"),
  /** Default reading of ambiguous numeric dates on the import mapping step. */
  defaultDateOrder: z.enum(["auto", "mdy", "dmy"]).default("mdy"),
  onboardingCompleted: z.boolean().default(false),
});

export const backupSchema = z.object({
  app: z.literal("budgetly"),
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  exportedAt: isoTimestamp,
  data: z.object({
    categories: z.array(categorySchema),
    accounts: z.array(accountSchema),
    transactions: z.array(transactionSchema),
    budgets: z.array(monthlyBudgetSchema),
    imports: z.array(importRecordSchema),
    settings: appSettingsSchema,
  }),
});

export type CategoryKind = z.infer<typeof categoryKindSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Account = z.infer<typeof accountSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type MonthlyBudget = z.infer<typeof monthlyBudgetSchema>;
export type ColumnMapping = z.infer<typeof columnMappingSchema>;
export type ImportRecord = z.infer<typeof importRecordSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type Backup = z.infer<typeof backupSchema>;
export type SignConvention = ColumnMapping["signConvention"];

export type BackupValidation =
  | { ok: true; backup: Backup }
  | { ok: false; errors: string[] };

/** Validates a parsed JSON value as a Budgetly backup, collecting readable errors. */
export function validateBackup(value: unknown): BackupValidation {
  const result = backupSchema.safeParse(value);
  if (result.success) return { ok: true, backup: result.data };

  const errors = result.error.issues.slice(0, 10).map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return { ok: false, errors };
}
