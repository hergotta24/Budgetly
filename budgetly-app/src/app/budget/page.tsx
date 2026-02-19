"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

type BudgetCategory = {
  id: string;
  name: string;
  limit: number;
};

const initialBudgets: BudgetCategory[] = [
  { id: crypto.randomUUID(), name: "Groceries", limit: 500 },
  { id: crypto.randomUUID(), name: "Dining Out", limit: 200 },
  { id: crypto.randomUUID(), name: "Utilities", limit: 300 },
];

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<BudgetCategory[]>(initialBudgets);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLimit, setNewCategoryLimit] = useState("");

  const totalBudget = useMemo(
    () => budgets.reduce((sum, item) => sum + item.limit, 0),
    [budgets]
  );

  const handleAddCategory = () => {
    const cleanedName = newCategoryName.trim();
    const parsedLimit = Number(newCategoryLimit);
    if (!cleanedName || !Number.isFinite(parsedLimit) || parsedLimit < 0) return;

    setBudgets((current) => [
      ...current,
      { id: crypto.randomUUID(), name: cleanedName, limit: parsedLimit },
    ]);

    setNewCategoryName("");
    setNewCategoryLimit("");
  };

  const handleCategoryChange = (id: string, value: string) => {
    setBudgets((current) =>
      current.map((item) => (item.id === id ? { ...item, name: value } : item))
    );
  };

  const handleLimitChange = (id: string, value: string) => {
    setBudgets((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const parsed = Number(value);
        return {
          ...item,
          limit: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
        };
      })
    );
  };

  const handleRemoveCategory = (id: string) => {
    setBudgets((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1>Set Your Budget Categories</h1>
          <p>
            Define how much you want to spend per category. Update limits anytime
            to keep your monthly plan aligned with your goals.
          </p>
        </section>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Total Monthly Budget</p>
            <h2>{formatCurrency(totalBudget)}</h2>
          </article>
          <article className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Budget Categories</p>
            <h2>{budgets.length}</h2>
          </article>
        </section>

        <section className={styles.addCard}>
          <h2>Add a Category</h2>
          <div className={styles.addForm}>
            <label className={styles.field}>
              <span>Category</span>
              <input
                type="text"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="e.g. Transportation"
              />
            </label>
            <label className={styles.field}>
              <span>Limit ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newCategoryLimit}
                onChange={(event) => setNewCategoryLimit(event.target.value)}
                placeholder="0.00"
              />
            </label>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleAddCategory}
            >
              Add Category
            </button>
          </div>
        </section>

        <section className={styles.tableCard} aria-label="Budget categories table">
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Monthly Limit</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={3}>
                    No budget categories yet. Add one above to get started.
                  </td>
                </tr>
              ) : (
                budgets.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <input
                        className={styles.tableInput}
                        type="text"
                        value={category.name}
                        onChange={(event) =>
                          handleCategoryChange(category.id, event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <div className={styles.limitField}>
                        <span>$</span>
                        <input
                          className={styles.tableInput}
                          type="number"
                          min="0"
                          step="0.01"
                          value={category.limit}
                          onChange={(event) =>
                            handleLimitChange(category.id, event.target.value)
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => handleRemoveCategory(category.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>(c) 2026 FinTrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
