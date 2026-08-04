import type { RootState } from "./store";

export const WORKSPACE_STORAGE_KEY = "budgetly.workspace";
export const WORKSPACE_SCHEMA_VERSION = 1;

type StorageAdapter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type StoredWorkspace = {
  version: typeof WORKSPACE_SCHEMA_VERSION;
  savedAt: string;
  data: RootState;
};

export type WorkspaceLoadResult =
  | { status: "empty" }
  | { status: "loaded"; state: RootState }
  | {
      status: "error";
      raw: string | null;
      message: string;
      kind: "corrupt" | "incompatible" | "unavailable";
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isCategory = (value: unknown) =>
  isRecord(value) && typeof value.name === "string";

const isTransaction = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.accountId === "string" &&
  typeof value.date === "string" &&
  typeof value.description === "string" &&
  isFiniteNumber(value.amount) &&
  isFiniteNumber(value.balance) &&
  typeof value.fromFile === "string" &&
  (value.alias === undefined || typeof value.alias === "string") &&
  (value.importId === undefined || typeof value.importId === "string") &&
  (value.category === undefined || isCategory(value.category));

const isImportedFile = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.fileName === "string" &&
  typeof value.importedAt === "string" &&
  Number.isInteger(value.transactionCount) &&
  (value.transactionCount as number) >= 0;

const isBudget = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  isFiniteNumber(value.limit) &&
  value.limit >= 0;

const isWorkspaceState = (value: unknown): value is RootState => {
  if (!isRecord(value)) return false;

  const { transactions, imports, categories, budgets } = value;
  return (
    isRecord(transactions) &&
    Array.isArray(transactions.transactions) &&
    transactions.transactions.every(isTransaction) &&
    isRecord(imports) &&
    Array.isArray(imports.imports) &&
    imports.imports.every(isImportedFile) &&
    isRecord(categories) &&
    Array.isArray(categories.categories) &&
    categories.categories.every(isCategory) &&
    isRecord(budgets) &&
    Array.isArray(budgets.budgets) &&
    budgets.budgets.every(isBudget)
  );
};

export function loadWorkspace(storage: StorageAdapter): WorkspaceLoadResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(WORKSPACE_STORAGE_KEY);
    if (raw === null) return { status: "empty" };

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.version !== "number") {
      return {
        status: "error",
        kind: "corrupt",
        raw,
        message: "The saved workspace is not in a recognized format.",
      };
    }

    if (parsed.version !== WORKSPACE_SCHEMA_VERSION) {
      return {
        status: "error",
        kind: "incompatible",
        raw,
        message: `This workspace uses unsupported data version ${parsed.version}.`,
      };
    }

    if (typeof parsed.savedAt !== "string" || !isWorkspaceState(parsed.data)) {
      return {
        status: "error",
        kind: "corrupt",
        raw,
        message: "The saved workspace is incomplete or damaged.",
      };
    }

    return { status: "loaded", state: parsed.data };
  } catch {
    return {
      status: "error",
      kind: raw === null ? "unavailable" : "corrupt",
      raw,
      message:
        raw === null
          ? "Local browser storage is unavailable."
          : "The saved workspace could not be read.",
    };
  }
}

export function saveWorkspace(storage: StorageAdapter, state: RootState) {
  const snapshot: StoredWorkspace = {
    version: WORKSPACE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    data: state,
  };
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
}

export function deleteWorkspace(storage: StorageAdapter) {
  storage.removeItem(WORKSPACE_STORAGE_KEY);
}
