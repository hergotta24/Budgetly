"use client";

import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addTransactions } from "@/store/slices/transactionsSlice";
import type { Transaction } from "@/types/transaction";
import styles from "./page.module.css";
import { useEffect } from "react";
import Papa from 'papaparse';
import { read } from "fs";



let possibleDescriptionValues = [
  "description",
  "memo",
  "details",
  "merchant",
  "name",
];

let possibleAccountIdValues = [
  "account",
  "account id",
  "accountnumber",
  "account number",
];

let possibleDateValues = [
  "date",
  "transaction date",
  "posted date",
  "post date",
];

let possibleBalanceValues = [
  "balance",
  "account balance",
  "running balance",
];

let possibleAmountValues = [
  "amount",
  "transaction amount",
  "amt",
  "value",
  "total",
  "signed amount",
];

let possibleDebitValues = [
  "debit",
  "withdrawal",
  "withdraw",
  "outflow",
  "charge",
  "payment",
  "expense",
];

let possibleCreditValues = [
  "credit",
  "deposit",
  "inflow",
  "refund",
  "income",
];


const topIcons = ["bell", "message", "moon"];

const icons: Record<string, any> = {
  upload: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 16V6" />
      <path d="m7 11 5-5 5 5" />
      <path d="M4 18h16" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z" />
      <path d="M14 3v6h6" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    </svg>
  ),
};

export default function Home() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const transactions = useAppSelector((s) => s.transactions.transactions);
  const displayedTransactionImportedFrom = ["file1.csv", "file2.csv"]; 

  useEffect(() => {
    // If user refreshes or visits directly, Redux is empty (memory-only).
    if (transactions.length === 0) router.replace("/import");
  }, [transactions.length, router]);

function normalizeHeaderKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function readField(
  row: Record<string, unknown>,
  aliases: string[]
): string | number | undefined {
  const aliasSet = new Set(aliases.map(normalizeHeaderKey));
  for (const [key, value] of Object.entries(row)) {
    if (aliasSet.has(normalizeHeaderKey(key))) return value as string | number;
  }
  return undefined;
}

function parseNumericValue(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  const isNegative = /^\s*\(.*\)\s*$/.test(trimmed) || /-\s*$/.test(trimmed);
  const normalized = trimmed
    .replace(/[$,]/g, "")
    .replace(/[()]/g, "")
    .replace(/\s+/g, "");

  if (!/^-?\d*\.?\d+$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;

  return isNegative ? -Math.abs(parsed) : parsed;
}

function resolveTransactionAmount(row: Record<string, unknown>): number {
  const directAmount = parseNumericValue(readField(row, possibleAmountValues));
  if (directAmount !== undefined) return directAmount;

  const debit = parseNumericValue(readField(row, possibleDebitValues)) ?? 0;
  const credit = parseNumericValue(readField(row, possibleCreditValues)) ?? 0;

  if (debit !== 0 || credit !== 0) {
    return credit - Math.abs(debit);
  }

  return 0;
}

async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
  const fileList = event.target.files;
  if (!fileList || fileList.length === 0) return;

  const userfiles = Array.from(fileList);
  try {
    const promisedTransactions = userfiles.map((file) => {
      return new Promise<Transaction[]>((resolve) => {
        const transactions: Transaction[] = [];
        Papa.parse<any>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Papa can finish "successfully" but still have row-level errors
            if (results.errors?.length) {
              resolve(transactions);
              return;
            }

            for (const transaction of results.data) {
              const id = crypto.randomUUID();
              const dateField = readField(transaction, possibleDateValues);
              const parsedDate = dateField ? new Date(dateField.toString()) : new Date();
              const date = Number.isNaN(parsedDate.getTime())? new Date().toISOString(): parsedDate.toISOString();
              const description = readField(transaction, possibleDescriptionValues);
              const amount = resolveTransactionAmount(transaction);
              const accountId = readField(transaction, possibleAccountIdValues);
              const balance = readField(transaction, possibleBalanceValues);
              const fromFile = file.name;
              transactions.push({ 
                id, 
                date, 
                description: description?.toString() || "", 
                amount, 
                accountId: accountId?.toString() || "", 
                balance: parseNumericValue(balance) || 0, 
                fromFile 
              } as Transaction);
            }
            resolve(transactions);
          },
        });
      });
    });
    const allTransactions = (await Promise.all(promisedTransactions)).flat();
    dispatch(addTransactions({ transactions: allTransactions }));
  } catch (err) {
    console.error("Failed to parse CSV(s):", err);
    // optionally show a toast / UI error
  }
}

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.dropzoneCard}>
          <div className={styles.dropIcon}>{icons.upload}</div>
          <h1>Drag & drop your CSV files here</h1>
          <p>or click the button below to browse</p>
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10"></div>
            <div>
              <label htmlFor="file-upload" className={styles.uploadButton}>
                Upload Files
              </label>
              <input
                id="file-upload"
                multiple
                type="file"
                accept=".csv"
                hidden
                onChange={handleImport}
              />
            </div>
          </div>
        </section>

        <section className={styles.history}>
          <div className={styles.sectionHeader}>
            <h2>Imported Files</h2>
            <span className={styles.sectionNote}>Last 30 days</span>
          </div>
          <ul className={styles.fileList}>
            {displayedTransactionImportedFrom.length === 0 ? (
              <li className={styles.fileItem}>
                <div className={styles.fileMeta}>
                  <span className={styles.fileIcon}>{icons.file}</span>
                  <div>
                    <p className={styles.fileName}>No files uploaded</p>
                    <p className={styles.fileInfo}>
                      Upload a CSV file to see it listed here.
                    </p>
                  </div>
                </div>
              </li>
            ) : (
              displayedTransactionImportedFrom.map((file) => {
                const fileName = file ?? "";
                return (
                  <li className={styles.fileItem} key={fileName}>
                    <div className={styles.fileMeta}>
                      <span className={styles.fileIcon}>{icons.file}</span>
                      <div>
                        <p className={styles.fileName}>{fileName}</p>
                        <p className={styles.fileInfo}>
                          CSV file - ready to import
                        </p>
                      </div>
                    </div>
                    <button
                      className={styles.trashButton}
                      type="button"
                      aria-label={`Remove ${fileName}`}
                    >
                      {icons.trash}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>(c) 2026 FinTrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
