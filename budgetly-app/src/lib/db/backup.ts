import { fileTimestamp } from "@/lib/date";
import { readAll, replaceAll } from "./repo";
import {
  BACKUP_SCHEMA_VERSION,
  validateBackup,
  type Backup,
  type BackupValidation,
} from "./schema";

/** Builds a complete, versioned backup of the local database. */
export async function createBackup(): Promise<Backup> {
  const data = await readAll();
  return {
    app: "budgetly",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function backupFilename(now: Date = new Date()): string {
  return `budgetly-backup_${fileTimestamp(now)}.json`;
}

export function transactionsFilename(scope: string, now: Date = new Date()): string {
  return `budgetly-transactions-${scope}_${fileTimestamp(now)}.csv`;
}

export type BackupSummary = {
  exportedAt: string;
  transactions: number;
  categories: number;
  budgets: number;
  accounts: number;
  imports: number;
};

export function summarizeBackup(backup: Backup): BackupSummary {
  return {
    exportedAt: backup.exportedAt,
    transactions: backup.data.transactions.length,
    categories: backup.data.categories.length,
    budgets: backup.data.budgets.length,
    accounts: backup.data.accounts.length,
    imports: backup.data.imports.length,
  };
}

/** Parses and validates backup JSON text without touching the database. */
export function readBackupText(text: string): BackupValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["This file is not valid JSON."] };
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "schemaVersion" in parsed &&
    typeof (parsed as { schemaVersion: unknown }).schemaVersion === "number" &&
    (parsed as { schemaVersion: number }).schemaVersion !== BACKUP_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      errors: [
        `This backup uses schema version ${
          (parsed as { schemaVersion: number }).schemaVersion
        }, but this version of Budgetly reads version ${BACKUP_SCHEMA_VERSION}.`,
      ],
    };
  }

  return validateBackup(parsed);
}

/** Replaces all local data with a validated backup. */
export async function restoreBackup(backup: Backup): Promise<void> {
  await replaceAll(backup.data);
}
