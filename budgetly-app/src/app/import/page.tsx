"use client";

import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addTransactions } from "@/store/slices/transactionSlice";
import type { Transaction } from "@/types/transations";
import type { UploadedFile } from "@/types/importedFile";
import styles from "./page.module.css";
import { useEffect } from "react";





const fileHistory = [
  "transactions_Q1_2023.csv",
  "bank_statement_april.csv",
  "credit_card_activity.csv",
  "march_spending_report.csv",
  "investment_data_feb.csv",
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

  const files = useAppSelector((s) => s.transactions.files);
  const displayedFiles = Array.from(
    new Set(
      files.length > 0
        ? [...files]
        : []
    )
  );

  useEffect(() => {
    // If user refreshes or visits directly, Redux is empty (memory-only).
    if (files.length === 0) router.replace("/import");
  }, [files.length, router]);

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const userfiles = Array.from(fileList);
    const uploadedFiles: UploadedFile[] = userfiles.map((file) => {
      const parsed: Transaction[] = [
        {
          id: crypto.randomUUID(),
          accountId: "checking",
          date: "2026-01-22",
          description: `Target (${file.name})`,
          amount: -45.23,
          category: "Shopping",
        },
      ];

      return {
        fileName: file.name,
        transactions: parsed,
      };
    });

    // 2) store in Redux (always append)
    dispatch(
      addTransactions({
        files: uploadedFiles,
      })
    );

    event.target.value = "";
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
            {displayedFiles.length === 0 ? (
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
              displayedFiles.map((file) => {
                const fileName = (file as UploadedFile).fileName ?? "";
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
