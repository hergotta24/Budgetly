import styles from "./page.module.css";

const navItems = [
  { label: "Import", icon: "upload", active: true },
  { label: "Transactions", icon: "list", active: false },
  { label: "Budget", icon: "wallet", active: false },
  { label: "Dashboard", icon: "grid", active: false },
  { label: "Spending", icon: "card", active: false },
  { label: "Export", icon: "download", active: false },
];

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
  list: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Z" />
      <path d="M16 11h4v2h-4z" />
      <path d="M4 7l2-3h14" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Z" />
      <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21 14a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z" />
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
  return (
    <div className={styles.page}>

      <main className={styles.main}>
        <section className={styles.dropzoneCard}>
          <div className={styles.dropIcon}>{icons.upload}</div>
          <h1>Drag & drop your CSV files here</h1>
          <p>or click the button below to browse</p>
          <button className={styles.uploadButton} type="button">
            Upload Files
          </button>
        </section>

        <section className={styles.history}>
          <div className={styles.sectionHeader}>
            <h2>Previously Imported Files</h2>
            <span className={styles.sectionNote}>Last 30 days</span>
          </div>
          <ul className={styles.fileList}>
            {fileHistory.map((file) => (
              <li className={styles.fileItem} key={file}>
                <div className={styles.fileMeta}>
                  <span className={styles.fileIcon}>{icons.file}</span>
                  <div>
                    <p className={styles.fileName}>{file}</p>
                    <p className={styles.fileInfo}>CSV file - ready to import</p>
                  </div>
                </div>
                <button
                  className={styles.trashButton}
                  type="button"
                  aria-label={`Remove ${file}`}
                >
                  {icons.trash}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>(c) 2026 FinTrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
