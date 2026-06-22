import styles from "./page.module.css";

const navItems = [
  { label: "Import", icon: "upload", active: true },
  { label: "Transactions", icon: "list", active: false },
  { label: "Budget", icon: "wallet", active: false },
  { label: "Dashboard", icon: "grid", active: false },
  { label: "Spending", icon: "card", active: false },
  { label: "Export", icon: "download", active: false },
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
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <h1>Welcome to Budgetly</h1>
            <p className={styles.lead}>Import your financial data, review transactions, set budgets, and visualize your spending — all in one place.</p>
            <p className={styles.small}>Use the navigation above to jump to Import, Transactions, Budget, Dashboard, Spending, or Export.</p>
          </div>
        </section>

        <section className={styles.overview}>
          <h2>What you can do</h2>
          <div className={styles.overviewGrid}>
            {navItems.map((item) => (
              <article key={item.label} className={styles.overviewCard}>
                <div className={styles.cardIcon}>{icons[item.icon]}</div>
                <h3>{item.label}</h3>
                <p>
                  {item.label === "Import" && "Bring in CSV files from banks or credit cards to start analyzing your data."}
                  {item.label === "Transactions" && "Search, filter and review every transaction with quick categorization tools."}
                  {item.label === "Budget" && "Create monthly budgets for categories and track progress against targets."}
                  {item.label === "Dashboard" && "At-a-glance metrics, trends, and balances to understand your financial health."}
                  {item.label === "Spending" && "Break down spending by category, merchant, and time to find saving opportunities."}
                  {item.label === "Export" && "Download summary reports or cleaned CSVs to share or archive your data."}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>(c) 2026 FinTrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
