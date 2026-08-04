import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteWorkspace,
  loadWorkspace,
  saveWorkspace,
  WORKSPACE_SCHEMA_VERSION,
  WORKSPACE_STORAGE_KEY,
} from "./persistence.ts";
import type { RootState } from "./store";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const workspace: RootState = {
  transactions: {
    transactions: [
      {
        id: "transaction-1",
        accountId: "checking",
        date: "2026-06-23T12:00:00.000Z",
        description: "Local grocery",
        amount: -42.5,
        balance: 1200,
        fromFile: "checking.csv",
        importId: "import-1",
        category: { name: "Groceries" },
      },
    ],
  },
  imports: {
    imports: [
      {
        id: "import-1",
        fileName: "checking.csv",
        importedAt: "2026-06-23T12:00:00.000Z",
        transactionCount: 1,
      },
    ],
  },
  categories: { categories: [{ name: "Groceries" }] },
  budgets: {
    budgets: [{ id: "budget-1", name: "Groceries", limit: 500 }],
  },
};

test("round-trips the complete workspace through local storage", () => {
  const storage = new MemoryStorage();

  saveWorkspace(storage, workspace);
  const result = loadWorkspace(storage);

  assert.equal(result.status, "loaded");
  if (result.status === "loaded") assert.deepEqual(result.state, workspace);
});

test("reports corrupt JSON without deleting the recovery source", () => {
  const storage = new MemoryStorage();
  storage.setItem(WORKSPACE_STORAGE_KEY, "{not-json");

  const result = loadWorkspace(storage);

  assert.equal(result.status, "error");
  if (result.status === "error") {
    assert.equal(result.kind, "corrupt");
    assert.equal(result.raw, "{not-json");
  }
  assert.equal(storage.getItem(WORKSPACE_STORAGE_KEY), "{not-json");
});

test("reports newer workspace versions as incompatible", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    WORKSPACE_STORAGE_KEY,
    JSON.stringify({
      version: WORKSPACE_SCHEMA_VERSION + 1,
      savedAt: new Date().toISOString(),
      data: workspace,
    }),
  );

  const result = loadWorkspace(storage);

  assert.equal(result.status, "error");
  if (result.status === "error") assert.equal(result.kind, "incompatible");
});

test("reports structurally invalid workspace data as corrupt", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    WORKSPACE_STORAGE_KEY,
    JSON.stringify({
      version: WORKSPACE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      data: { ...workspace, budgets: { budgets: [{ limit: -10 }] } },
    }),
  );

  const result = loadWorkspace(storage);

  assert.equal(result.status, "error");
  if (result.status === "error") assert.equal(result.kind, "corrupt");
});

test("permanently removes the stored workspace", () => {
  const storage = new MemoryStorage();
  saveWorkspace(storage, workspace);

  deleteWorkspace(storage);

  assert.deepEqual(loadWorkspace(storage), { status: "empty" });
});
